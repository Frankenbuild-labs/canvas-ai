# Exa API Platform Support for Lead Generation

## Overview
Exa API provides different search capabilities depending on the platform. Here's what's supported for each platform in our lead generation system.

## Platform Support Matrix

### ✅ Fully Supported (Native Exa Categories)

#### LinkedIn
- **Exa Category**: `linkedin profile`
- **Support Level**: ⭐⭐⭐⭐⭐ Excellent
- **Features**:
  - Native LinkedIn profile search
  - Name extraction from profile titles
  - Company extraction from bio/content
  - Email enrichment via Hunter.io
  - Phone enrichment (coming soon)
- **Best Use Case**: Professional B2B lead generation, hiring, partnership outreach

#### Twitter/X  
- **Exa Category**: `tweet`
- **Support Level**: ⭐⭐⭐⭐ Good
- **Features**:
  - Tweet-level search (not full profiles)
  - Username/handle extraction
  - Content analysis
  - Limited enrichment (social platforms don't have business emails)
- **Best Use Case**: Influencer marketing, social media leads, community engagement

### ⚠️ Partially Supported (Domain Filtering)

These platforms don't have dedicated Exa categories, so we use domain filtering (`includeDomains`):

#### Instagram
- **Exa Strategy**: Domain filter `instagram.com`
- **Support Level**: ⭐⭐ Limited
- **Limitations**: Instagram blocks most web scraping
- **Best Use Case**: Influencer profiles if publicly accessible

#### Facebook
- **Exa Strategy**: Domain filter `facebook.com`
- **Support Level**: ⭐⭐ Limited
- **Limitations**: Facebook heavily restricts web access
- **Best Use Case**: Public business pages only

#### TikTok
- **Exa Strategy**: Domain filter `tiktok.com`
- **Support Level**: ⭐⭐⭐ Moderate
- **Limitations**: Profile data varies
- **Best Use Case**: Creator/influencer discovery

#### YouTube
- **Exa Strategy**: Domain filter `youtube.com`
- **Support Level**: ⭐⭐⭐ Moderate
- **Features**: Can find channel pages and creator profiles
- **Best Use Case**: Content creator partnerships, video marketing leads

#### Reddit
- **Exa Strategy**: Domain filter `reddit.com`
- **Support Level**: ⭐⭐⭐ Moderate
- **Features**: Post/comment search, user profile discovery
- **Best Use Case**: Community managers, niche market research

#### General Web
- **Exa Category**: `personal site`
- **Support Level**: ⭐⭐⭐⭐ Good
- **Features**: Personal websites, portfolios, blogs
- **Best Use Case**: Freelancers, consultants, personal brands

## Email/Phone Enrichment Support

### Works Best With:
- ✅ **LinkedIn**: Full enrichment support (Hunter.io integration)
- ✅ **General Web**: Personal sites often have contact info

### Limited Support:
- ⚠️ **Twitter/X**: Users rarely share business emails publicly
- ⚠️ **Instagram/Facebook/TikTok**: Social platforms don't expose business contact info
- ⚠️ **YouTube**: Creators use YouTube contact forms, not direct emails
- ⚠️ **Reddit**: Anonymous platform, no business contact data

## Recommendations

### For B2B Lead Generation:
1. **LinkedIn** (Primary) - Best results
2. **General Web** (Secondary) - Company websites, personal portfolios
3. **Twitter/X** (Tertiary) - Social presence verification

### For Influencer/Creator Marketing:
1. **YouTube** - Content creators
2. **Instagram** - Visual creators (limited data)
3. **TikTok** - Short-form video creators
4. **Twitter/X** - Social media influencers

### For Community/Research:
1. **Reddit** - Niche communities
2. **Twitter/X** - Public conversations
3. **General Web** - Blogs and forums

## Technical Details

### Exa API Categories Available:
- `company` - Company profiles
- `research paper` - Academic papers
- `news` - News articles
- `pdf` - PDF documents
- `github` - GitHub repositories
- `tweet` - Twitter/X tweets
- `personal site` - Personal websites
- `linkedin profile` - LinkedIn profiles ✅ (We use this)
- `financial report` - Financial documents

### Our Implementation:
```typescript
Platform → Exa Strategy
LinkedIn → { category: 'linkedin profile' }
Twitter/X → { category: 'tweet' }
Instagram → { includeDomains: ['instagram.com'] }
Facebook → { includeDomains: ['facebook.com'] }
TikTok → { includeDomains: ['tiktok.com'] }
YouTube → { includeDomains: ['youtube.com'] }
Reddit → { includeDomains: ['reddit.com'] }
General Web → { category: 'personal site' }
```

## Future Enhancements

1. **Multi-Platform Search**: Run queries across multiple platforms simultaneously
2. **Cross-Reference**: Match leads found on LinkedIn with their Twitter/YouTube presence
3. **Enhanced Enrichment**: 
   - RocketReach API for phone numbers
   - Clearbit for company data
   - Apollo.io for verified contacts
4. **Social Verification**: Check if LinkedIn leads have active social media presence

## Cost Considerations

Exa API pricing (as of Dec 2025):
- Neural search (1-25 results): $0.005 per request
- Neural search (26-100 results): $0.025 per request
- Content text/highlights: $0.001 per page
- Content summary: $0.001 per page

**Our typical query costs**:
- 25 leads with content: ~$0.030
- 100 leads with content: ~$0.125
- 300 leads with content: ~$0.300 (requires API key upgrade)
