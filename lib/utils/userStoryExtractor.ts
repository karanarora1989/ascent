export interface ExtractedUserStory {
  title: string;
  description: string;
  acceptance_criteria: string;
  order_index: number;
}

export function extractUserStories(markdown: string): ExtractedUserStory[] {
  const stories: ExtractedUserStory[] = [];
  
  // Find User Stories section
  const userStoriesMatch = markdown.match(/##\s*User Stories([\s\S]*?)(?=##|$)/i);
  
  if (!userStoriesMatch) {
    return stories;
  }
  
  const userStoriesSection = userStoriesMatch[1];
  
  // Match numbered or bulleted lists
  // Patterns: "1. ", "- ", "* ", etc.
  const storyPattern = /(?:^|\n)(?:\d+\.|[-*])\s+(.+?)(?=\n(?:\d+\.|[-*])|$)/g;
  const matches: string[] = userStoriesSection.match(storyPattern) || [];
  
  matches.forEach((match: string, index: number) => {
    // Extract the story text (remove the bullet/number prefix)
    const storyText = match.replace(/^(?:\n)?(?:\d+\.|[-*])\s+/, '').trim();
    
    // Try to extract title and description
    // Format: "As a [user], I want [feature] so that [benefit]"
    // Or: "Title: description"
    // Or: Just "Title"
    
    let title = storyText;
    let description = '';
    let acceptance_criteria = '';
    
    // Check for "As a" pattern
    const asAPattern = /^As a (.+?), I want (.+?)(?:so that (.+?))?$/i;
    const asAMatch = storyText.match(asAPattern);
    
    if (asAMatch) {
      title = `As a ${asAMatch[1]}, I want ${asAMatch[2]}`;
      description = asAMatch[3] || '';
    } else {
      // Check for colon separator
      const colonIndex = storyText.indexOf(':');
      if (colonIndex > 0 && colonIndex < 100) {
        title = storyText.substring(0, colonIndex).trim();
        description = storyText.substring(colonIndex + 1).trim();
      } else {
        // Use first line as title, rest as description
        const lines = storyText.split('\n');
        title = lines[0].trim();
        description = lines.slice(1).join('\n').trim();
      }
    }
    
    // Look for acceptance criteria in the description
    const acMatch = description.match(/(?:Acceptance Criteria|AC):?\s*(.+)/i);
    if (acMatch) {
      acceptance_criteria = acMatch[1].trim();
      description = description.replace(/(?:Acceptance Criteria|AC):?\s*.+/i, '').trim();
    }
    
    stories.push({
      title: title.substring(0, 500), // Limit length
      description: description.substring(0, 2000),
      acceptance_criteria: acceptance_criteria.substring(0, 2000),
      order_index: index,
    });
  });
  
  return stories;
}
