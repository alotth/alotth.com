# PRD: TikTok Liked Videos Scraper & Mindmap Integration

## Introduction/Overview

This feature will create a comprehensive system to scrape TikTok liked videos data, extract transcriptions, and automatically import them into the mindmap system for knowledge organization. The goal is to transform liked TikTok content into an organized, searchable knowledge base with intelligent connections based on hashtags and content themes.

## Goals

1. **Personal Knowledge Archive**: Create a searchable personal archive of all liked TikTok videos with rich metadata
2. **Intelligent Content Organization**: Automatically group and connect videos based on hashtags and content themes  
3. **Transcription Integration**: Extract and include video transcriptions for deeper content analysis
4. **Mindmap Integration**: Seamlessly import organized data into the existing mindmap system
5. **Incremental Updates**: Support for adding new liked videos without reprocessing existing ones
6. **Anti-Detection**: Implement scraping techniques that avoid being detected as spam/bot

## User Stories

1. **As a user**, I want to scrape all my TikTok liked videos so that I can preserve and organize this content
2. **As a user**, I want video transcriptions automatically generated so that I can search content by text
3. **As a user**, I want videos automatically grouped by themes/hashtags so that I can explore related content easily
4. **As a user**, I want the data imported into my mindmap so that I can visualize connections between videos
5. **As a user**, I want to update my collection incrementally so that I don't have to reprocess everything each time
6. **As a user**, I want hashtag-based projects created automatically so that popular themes become clear organizational structures

## Functional Requirements

### Phase 1: Data Extraction
1. **The system must** scrape TikTok liked videos page when user is authenticated
2. **The system must** extract the following data for each video:
   - Video URL
   - Title/Description  
   - View count
   - Creator username (@username)
   - All hashtags
   - Thumbnail image URL
3. **The system must** save raw scraped data in CSV format
4. **The system must** implement rate limiting and human-like browsing patterns to avoid detection
5. **The system must** handle pagination to get all liked videos

### Phase 2: Content Processing  
6. **The system must** analyze hashtag frequency across all videos
7. **The system must** identify hashtags mentioned 3+ times as "theme projects"
8. **The system must** download video audio for transcription processing
9. **The system must** generate transcriptions using adapted `main_as.py` script with TikTok video URLs
10. **The system must** maintain existing AssemblyAI features (speaker labels, content safety, Portuguese language)
11. **The system must** extract additional hashtags/themes from transcriptions
12. **The system must** update hashtag analysis with transcription-derived tags

### Phase 3: Mindmap Integration
13. **The system must** convert processed data to the mindmap JSON format
14. **The system must** create project nodes for frequent hashtags (3+ mentions)
15. **The system must** create individual video nodes with all metadata
16. **The system must** generate edges connecting videos with shared hashtags
17. **The system must** include thumbnail images in node content
18. **The system must** format node content with: thumbnail, title, views, creator, hashtags, URL, transcription

### Phase 4: Incremental Updates
19. **The system must** read existing data files to identify already processed videos
20. **The system must** process only new liked videos in subsequent runs
21. **The system must** merge new data with existing mindmap structure
22. **The system must** update hashtag project assignments when new frequent tags emerge

## Non-Goals (Out of Scope)

1. **Video Download**: Local video storage is not included in this phase
2. **Real-time Monitoring**: Automatic periodic checking for new likes
3. **Multi-user Support**: This is designed for single-user personal use
4. **TikTok API Integration**: Using web scraping instead of official API
5. **Video Editing/Processing**: Focus is on metadata and transcription only
6. **Advanced AI Analysis**: Beyond hashtag extraction from transcriptions

## Technical Considerations

### Required Technologies
- **Web Scraping**: Selenium/Playwright for authenticated TikTok access
- **Transcription**: AssemblyAI API (existing integration available)
- **Audio Extraction**: yt-dlp or similar tool for TikTok video processing
- **Data Processing**: Python with pandas for CSV/JSON manipulation
- **Anti-Detection**: Random delays, user-agent rotation, session management

### Integration Points
- **Existing Mindmap System**: Must output compatible JSON format per data-import-guide.md
- **AssemblyAI Integration**: Directly integrate and extend existing `main_as.py` script
  - Reuse `transcribe_audio()` function with URL support
  - Leverage existing logging and error handling
  - Extend configuration for TikTok-specific processing
  - Maintain existing speaker labels and content safety features
- **Storage**: File-based approach with CSV intermediate and JSON final output

### Data Flow
1. Scrape TikTok → CSV raw data
2. Process CSV → Extract audio URLs → Transcribe using adapted `main_as.py`
3. Analyze hashtags → Generate mindmap structure  
4. Output JSON → Import to mindmap

### AssemblyAI Script Integration (`main_as.py`)

**Existing Components to Reuse:**
- ✅ `transcribe_audio()` function - Already supports URLs
- ✅ API key management via environment variables
- ✅ Logging configuration and error handling
- ✅ Portuguese language configuration (`language_code="pt"`)
- ✅ Speaker labels and content safety detection

**Required Modifications:**
1. **Batch Processing**: Modify to accept list of TikTok video URLs instead of local audio files
2. **Output Format**: Change from single `transcriptions.txt` to individual JSON objects per video
3. **Metadata Integration**: Include video metadata (title, creator, hashtags) in transcription output
4. **Progress Tracking**: Add progress indicators for processing multiple videos
5. **Error Recovery**: Handle individual video failures without stopping entire batch

**Enhanced Output Structure:**
```json
{
  "video_url": "https://tiktok.com/@user/video/123",
  "transcription": "Full transcription text...",
  "speaker_labels": [...],
  "content_safety": {...},
  "processing_status": "success",
  "processed_at": "2024-01-15T10:30:00Z"
}
```

## Success Metrics

1. **Coverage**: Successfully extract data from 95%+ of liked videos
2. **Accuracy**: Correct hashtag and metadata extraction in 98%+ of cases
3. **Transcription Quality**: Readable transcriptions for 90%+ of videos
4. **Organization Effectiveness**: Meaningful hashtag groupings that reduce manual organization time by 80%
5. **Update Efficiency**: Incremental updates process only new content (0% duplication)
6. **Anti-Detection Success**: Complete scraping runs without being blocked/rate-limited

## Open Questions

1. **Hashtag Hierarchy**: Should we create sub-categories for related hashtags (e.g., #programming, #javascript, #webdev)?
2. **Transcription Language**: Should we attempt language detection or default to Portuguese?
3. **Image Storage**: Should thumbnails be downloaded locally or kept as external URLs?
4. **Error Handling**: How should we handle videos that become unavailable or private?
5. **Data Persistence**: Should we maintain a database or rely solely on file-based storage?
6. **Batch Size**: What's the optimal number of videos to process in each batch to balance speed vs. resource usage?

## Design Considerations

### File Structure
```
/tiktok-scraper/
├── scraped-data/
│   ├── raw-likes.csv
│   ├── processed-videos.csv
│   └── mindmap-import.json
├── transcriptions/
│   ├── audio-files/
│   └── transcripts/
├── config/
│   └── settings.json
└── logs/
    └── scraper.log
```

### Node Content Format (Markdown)
```markdown
![Thumbnail](thumbnail_url)

**Creator**: @username
**Views**: 123.4K
**URL**: [Watch Video](tiktok_url)

## Description
Video title/description text

## Hashtags
#tag1 #tag2 #tag3

## Transcription
Full video transcription text...
```

### Edge Connection Logic
- Videos sharing 2+ hashtags → Strong connection
- Videos from same creator → Medium connection  
- Videos with related transcription themes → Weak connection 