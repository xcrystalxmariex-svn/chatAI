# Web Research Assistant

## Description
A skill pack that helps the AI agent conduct thorough web research by providing structured approaches to finding, analyzing, and summarizing information from the web.

## Tool: research_topic
Conducts comprehensive research on a given topic by searching multiple sources and compiling findings.

### Parameters
- topic (string, required): The main topic or question to research
- depth (string): How deep to research - "quick", "standard", or "thorough"
- sources (number): Number of sources to consult (default: 3)

## Tool: fact_check
Verifies a claim or statement by searching for supporting or contradicting evidence.

### Parameters
- claim (string, required): The claim or statement to verify
- context (string): Additional context about where this claim came from

## Tool: compare_sources
Compares information from multiple sources on the same topic to identify consensus and disagreements.

### Parameters
- topic (string, required): The topic to compare across sources
- sourceUrls (string): Comma-separated list of URLs to compare

## Tool: summarize_findings
Creates a structured summary of research findings with key points and sources.

### Parameters
- findings (string, required): The raw findings to summarize
- format (string): Output format - "bullets", "paragraph", or "report"
