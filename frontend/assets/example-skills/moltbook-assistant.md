# Moltbook Assistant

## Description
Specialized tools for interacting with and navigating Moltbook - a social platform. Helps browse profiles, posts, and content on the platform.

## Tool: browse_moltbook_feed
Navigates to Moltbook and browses the main feed or a specific user's posts.

### Parameters
- username (string): Optional username to view their profile/posts
- feedType (string): Type of feed - "home", "trending", "latest"

## Tool: search_moltbook
Searches Moltbook for specific content, users, or topics.

### Parameters
- query (string, required): Search term or hashtag
- type (string): What to search for - "posts", "users", "tags"

## Tool: read_moltbook_post
Reads and extracts content from a specific Moltbook post.

### Parameters
- postUrl (string, required): The URL of the post to read
- includeComments (string): Whether to include comments - "yes" or "no"

## Tool: get_moltbook_profile
Gets information about a Moltbook user profile.

### Parameters
- username (string, required): The username to look up
