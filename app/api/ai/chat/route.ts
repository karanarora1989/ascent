import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { anthropic, MODEL, SYSTEM_PROMPTS } from '@/lib/anthropic/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, systemPromptKey, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Get system prompt
    const systemPrompt = systemPromptKey 
      ? SYSTEM_PROMPTS[systemPromptKey as keyof typeof SYSTEM_PROMPTS]
      : SYSTEM_PROMPTS.insights;

    if (!systemPrompt) {
      console.error(`Invalid system prompt key: ${systemPromptKey}`);
      return NextResponse.json(
        { error: 'Invalid AI configuration' },
        { status: 400 }
      );
    }

    // Add context to system prompt if provided
    const finalSystemPrompt = context 
      ? `${systemPrompt}\n\nContext:\n${JSON.stringify(context, null, 2)}`
      : systemPrompt;

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: finalSystemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Convert Anthropic stream to ReadableStream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process chat request';
    let statusCode = 500;

    if (error instanceof Error) {
      // Check for common Anthropic API errors
      if (error.message.includes('authentication') || error.message.includes('api_key')) {
        errorMessage = 'AI service authentication failed. Please check API key configuration.';
        statusCode = 500;
      } else if (error.message.includes('rate_limit')) {
        errorMessage = 'AI service rate limit exceeded. Please try again in a moment.';
        statusCode = 429;
      } else if (error.message.includes('overloaded')) {
        errorMessage = 'AI service is temporarily overloaded. Please try again.';
        statusCode = 503;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
