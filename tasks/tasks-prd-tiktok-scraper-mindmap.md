## Relevant Files

- `scripts/tiktok-scraper/scraper.py` - Main scraping script for TikTok liked videos page
- `scripts/tiktok-scraper/scraper.test.py` - Unit tests for scraper functionality
- `scripts/tiktok-scraper/transcription_processor.py` - Adapted main_as.py for TikTok video processing
- `scripts/tiktok-scraper/transcription_processor.test.py` - Unit tests for transcription processing
- `scripts/tiktok-scraper/hashtag_analyzer.py` - Hashtag frequency analysis and theme detection
- `scripts/tiktok-scraper/hashtag_analyzer.test.py` - Unit tests for hashtag analysis
- `scripts/tiktok-scraper/mindmap_converter.py` - Convert processed data to mindmap JSON format
- `scripts/tiktok-scraper/mindmap_converter.test.py` - Unit tests for mindmap conversion
- `scripts/tiktok-scraper/incremental_updater.py` - Handle incremental updates without reprocessing
- `scripts/tiktok-scraper/incremental_updater.test.py` - Unit tests for incremental updates
- `scripts/tiktok-scraper/config.py` - Configuration management and settings
- `scripts/tiktok-scraper/utils.py` - Utility functions for data processing and file operations
- `scripts/tiktok-scraper/utils.test.py` - Unit tests for utility functions
- `scripts/tiktok-scraper/main.py` - Main orchestration script that coordinates all components
- `scripts/tiktok-scraper/requirements.txt` - Python dependencies for the scraper

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `scraper.py` and `scraper.test.py` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Setup TikTok Web Scraping Infrastructure
  - [ ] 1.1 Create project directory structure and initialize Python virtual environment
  - [ ] 1.2 Install and configure Selenium/Playwright dependencies with TikTok-compatible browser setup
  - [ ] 1.3 Implement anti-detection measures (user agent rotation, random delays, session management)
  - [ ] 1.4 Create browser automation class for TikTok authentication and navigation
  - [ ] 1.5 Implement pagination handling to scroll through all liked videos
  - [ ] 1.6 Add rate limiting and human-like browsing patterns to avoid detection
  - [ ] 1.7 Create logging and error handling for scraping operations
- [ ] 2.0 Implement Video Data Extraction and Processing
  - [ ] 2.1 Parse TikTok liked videos page HTML to identify video containers
  - [ ] 2.2 Extract video metadata (URL, title/description, creator username, view count)
  - [ ] 2.3 Extract hashtags from video descriptions using regex patterns
  - [ ] 2.4 Extract thumbnail image URLs from video elements
  - [ ] 2.5 Implement CSV export functionality for raw scraped data
  - [ ] 2.6 Add data validation and cleaning for extracted fields
  - [ ] 2.7 Handle edge cases (private videos, deleted content, missing data)
- [ ] 3.0 Adapt AssemblyAI Integration for TikTok Videos
  - [ ] 3.1 Copy and modify main_as.py to create transcription_processor.py
  - [ ] 3.2 Adapt transcribe_audio() function to accept TikTok video URLs instead of local files
  - [ ] 3.3 Implement batch processing to handle multiple video URLs from CSV
  - [ ] 3.4 Integrate video metadata (title, creator, hashtags) into transcription output
  - [ ] 3.5 Change output format from single text file to individual JSON objects per video
  - [ ] 3.6 Add progress tracking and logging for batch transcription processing
  - [ ] 3.7 Implement error recovery to handle individual video failures without stopping entire batch
- [ ] 4.0 Build Hashtag Analysis and Theme Detection System
  - [ ] 4.1 Create hashtag frequency analyzer to count occurrences across all videos
  - [ ] 4.2 Implement logic to identify "theme hashtags" with 3+ mentions
  - [ ] 4.3 Extract additional hashtags and themes from video transcriptions using NLP
  - [ ] 4.4 Create theme project generator for frequent hashtags
  - [ ] 4.5 Implement connection logic for videos sharing common hashtags (2+ shared = connection)
  - [ ] 4.6 Add support for updating hashtag analysis when new videos are added
  - [ ] 4.7 Create hashtag hierarchy and grouping system for related tags
- [ ] 5.0 Create Mindmap JSON Conversion and Integration
  - [ ] 5.1 Implement converter to transform processed data into mindmap JSON format per data-import-guide.md
  - [ ] 5.2 Create project nodes for each identified theme/hashtag with 3+ videos
  - [ ] 5.3 Generate individual video nodes with formatted Markdown content (thumbnail, metadata, transcription)
  - [ ] 5.4 Implement edge generation between videos sharing hashtags and between videos and theme projects
  - [ ] 5.5 Calculate node positions using grid layout for automatic positioning
  - [ ] 5.6 Create incremental update system to merge new videos with existing mindmap structure
  - [ ] 5.7 Implement main orchestration script to coordinate all components from scraping to mindmap output 