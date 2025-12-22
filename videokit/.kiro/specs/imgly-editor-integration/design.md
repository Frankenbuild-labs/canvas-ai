# Design Document

## Overview

This design outlines the complete replacement of the current Remotion-based video editor with IMG.LY's VideoEditor SDK and PhotoEditor SDK. The new architecture will provide a unified, tabbed editing experience that allows seamless switching between video and photo editing modes while maintaining integration with existing fal.ai infrastructure and IndexedDB storage.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Design Tab    │  │   Video Tab     │  │  Photo Tab   │ │
│  │   (Landing)     │  │  (VideoEditor)  │  │(PhotoEditor) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Editor State Manager                        │
│              (Zustand + React Context)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   IMG.LY        │  │   IMG.LY        │  │   fal.ai     │ │
│  │ VideoEditor SDK │  │ PhotoEditor SDK │  │ Integration  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   IndexedDB     │  │   Media Store   │  │   Project    │ │
│  │   Storage       │  │   (Assets)      │  │   State      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

The application will be restructured around a tabbed interface with three main modes:

1. **Design Tab**: Landing/overview mode for project management
2. **Video Tab**: Full IMG.LY VideoEditor SDK integration
3. **Photo Tab**: Full IMG.LY PhotoEditor SDK integration

## Components and Interfaces

### Core Components

#### 1. EditorTabs Component
```typescript
interface EditorTabsProps {
  activeTab: 'design' | 'video' | 'photo';
  onTabChange: (tab: string) => void;
  projectId: string;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  activeTab,
  onTabChange,
  projectId
}) => {
  // Tab switching logic with state preservation
  // Integration with editor state manager
}
```

#### 2. VideoEditorContainer Component
```typescript
interface VideoEditorContainerProps {
  projectId: string;
  initialAssets?: MediaAsset[];
  onSave: (projectData: VideoProjectData) => void;
  onExport: (exportData: ExportData) => void;
}

const VideoEditorContainer: React.FC<VideoEditorContainerProps> = ({
  projectId,
  initialAssets,
  onSave,
  onExport
}) => {
  // IMG.LY VideoEditor SDK initialization
  // Asset management and timeline integration
  // Export functionality
}
```

#### 3. PhotoEditorContainer Component
```typescript
interface PhotoEditorContainerProps {
  projectId: string;
  initialImage?: string;
  onSave: (imageData: EditedImageData) => void;
  onAddToProject: (imageData: EditedImageData) => void;
}

const PhotoEditorContainer: React.FC<PhotoEditorContainerProps> = ({
  projectId,
  initialImage,
  onSave,
  onAddToProject
}) => {
  // IMG.LY PhotoEditor SDK initialization
  // Image editing and filter application
  // Save and export functionality
}
```

#### 4. EditorStateManager
```typescript
interface EditorState {
  activeTab: 'design' | 'video' | 'photo';
  projectId: string;
  mediaAssets: MediaAsset[];
  videoProjectData: VideoProjectData | null;
  photoEditingData: PhotoEditingData | null;
  isLoading: boolean;
  error: string | null;
}

interface EditorActions {
  setActiveTab: (tab: string) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  addMediaAsset: (asset: MediaAsset) => void;
  updateVideoProject: (data: VideoProjectData) => void;
  updatePhotoProject: (data: PhotoEditingData) => void;
}
```

### IMG.LY SDK Integration

#### VideoEditor SDK Configuration
```typescript
const videoEditorConfig = {
  license: process.env.IMGLY_LICENSE_KEY,
  userId: 'user-id',
  baseURL: '/imgly-assets/',
  presets: {
    // Custom presets for video editing
    timeline: {
      trackHeight: 60,
      showThumbnails: true,
      enableMultiTrack: true
    },
    export: {
      format: 'mp4',
      quality: 'high',
      resolution: '1080p'
    }
  },
  callbacks: {
    onSave: handleVideoSave,
    onExport: handleVideoExport,
    onAssetAdd: handleAssetAdd
  }
};
```

#### PhotoEditor SDK Configuration
```typescript
const photoEditorConfig = {
  license: process.env.IMGLY_LICENSE_KEY,
  userId: 'user-id',
  baseURL: '/imgly-assets/',
  presets: {
    // Custom presets for photo editing
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#ffffff'
    },
    export: {
      format: 'png',
      quality: 0.9,
      enableTransparency: true
    }
  },
  callbacks: {
    onSave: handlePhotoSave,
    onExport: handlePhotoExport,
    onAddToProject: handleAddToVideoProject
  }
};
```

## Data Models

### Enhanced Project Schema
```typescript
interface UnifiedProject {
  id: string;
  name: string;
  type: 'video' | 'photo' | 'mixed';
  createdAt: Date;
  updatedAt: Date;
  
  // Video project data (IMG.LY VideoEditor format)
  videoData?: {
    timeline: TimelineData;
    tracks: TrackData[];
    effects: EffectData[];
    transitions: TransitionData[];
    settings: VideoSettings;
  };
  
  // Photo project data (IMG.LY PhotoEditor format)
  photoData?: {
    canvas: CanvasData;
    layers: LayerData[];
    filters: FilterData[];
    adjustments: AdjustmentData[];
    settings: PhotoSettings;
  };
  
  // Shared assets
  mediaAssets: MediaAsset[];
  
  // fal.ai integration data
  aiGeneratedContent: {
    videos: AIVideoData[];
    images: AIImageData[];
    prompts: PromptHistory[];
  };
}
```

### Media Asset Schema
```typescript
interface MediaAsset {
  id: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // for video/audio
  dimensions?: { width: number; height: number };
  fileSize: number;
  format: string;
  
  // IMG.LY specific metadata
  imglyMetadata?: {
    videoEditorId?: string;
    photoEditorId?: string;
    editHistory?: EditOperation[];
  };
  
  // fal.ai specific data
  aiGenerated?: {
    model: string;
    prompt: string;
    parameters: Record<string, any>;
    generatedAt: Date;
  };
}
```

## Error Handling

### SDK Loading and Initialization
```typescript
class EditorSDKManager {
  private videoSDK: VideoEditorSDK | null = null;
  private photoSDK: PhotoEditorSDK | null = null;
  
  async initializeVideoSDK(config: VideoEditorConfig): Promise<VideoEditorSDK> {
    try {
      if (!this.videoSDK) {
        this.videoSDK = await VideoEditorSDK.init(config);
      }
      return this.videoSDK;
    } catch (error) {
      throw new EditorInitializationError('Failed to initialize Video SDK', error);
    }
  }
  
  async initializePhotoSDK(config: PhotoEditorConfig): Promise<PhotoEditorSDK> {
    try {
      if (!this.photoSDK) {
        this.photoSDK = await PhotoEditorSDK.init(config);
      }
      return this.photoSDK;
    } catch (error) {
      throw new EditorInitializationError('Failed to initialize Photo SDK', error);
    }
  }
  
  handleSDKError(error: SDKError): void {
    // Centralized error handling for SDK operations
    console.error('SDK Error:', error);
    
    if (error.type === 'LICENSE_ERROR') {
      // Handle license issues
      this.showLicenseError();
    } else if (error.type === 'ASSET_LOAD_ERROR') {
      // Handle asset loading issues
      this.showAssetError(error.assetId);
    } else {
      // Generic error handling
      this.showGenericError(error.message);
    }
  }
}
```

### State Synchronization Error Handling
```typescript
class StateManager {
  async syncProjectState(projectId: string): Promise<void> {
    try {
      const project = await this.loadProject(projectId);
      
      // Validate project data integrity
      if (!this.validateProjectData(project)) {
        throw new DataIntegrityError('Project data is corrupted');
      }
      
      // Sync with both SDKs if needed
      await Promise.all([
        this.syncVideoEditorState(project.videoData),
        this.syncPhotoEditorState(project.photoData)
      ]);
      
    } catch (error) {
      if (error instanceof DataIntegrityError) {
        // Attempt data recovery
        await this.attemptDataRecovery(projectId);
      } else {
        // Log error and show user-friendly message
        this.handleSyncError(error);
      }
    }
  }
}
```

## Testing Strategy

### Unit Testing
- **Component Testing**: Test each editor container component in isolation
- **State Management Testing**: Test Zustand store actions and state updates
- **SDK Integration Testing**: Mock IMG.LY SDKs and test integration points
- **Data Model Testing**: Test project data serialization/deserialization

### Integration Testing
- **Tab Switching**: Test state preservation when switching between modes
- **Asset Sharing**: Test media assets availability across different editor modes
- **fal.ai Integration**: Test AI-generated content import into editors
- **Export Functionality**: Test export from both video and photo editors

### End-to-End Testing
- **Complete Workflow**: Test full user journey from project creation to export
- **Cross-Mode Operations**: Test editing photos and using them in videos
- **Performance Testing**: Test editor performance with large projects
- **Browser Compatibility**: Test across different browsers and devices

### Testing Tools
```typescript
// Jest + React Testing Library for component tests
describe('VideoEditorContainer', () => {
  it('should initialize IMG.LY VideoEditor SDK', async () => {
    const mockSDK = jest.fn();
    jest.mock('@imgly/video-editor-sdk', () => mockSDK);
    
    render(<VideoEditorContainer projectId="test-id" />);
    
    await waitFor(() => {
      expect(mockSDK).toHaveBeenCalledWith(expect.objectContaining({
        license: expect.any(String)
      }));
    });
  });
});

// Cypress for E2E testing
describe('Editor Integration', () => {
  it('should allow switching between video and photo modes', () => {
    cy.visit('/editor/test-project');
    cy.get('[data-testid="video-tab"]').click();
    cy.get('[data-testid="video-editor"]').should('be.visible');
    
    cy.get('[data-testid="photo-tab"]').click();
    cy.get('[data-testid="photo-editor"]').should('be.visible');
  });
});
```

## Migration Strategy

### Phase 1: Setup and Infrastructure
1. Install IMG.LY VideoEditor and PhotoEditor SDKs
2. Create new tabbed interface components
3. Set up new state management structure
4. Configure SDK initialization and licensing

### Phase 2: Core Editor Integration
1. Implement VideoEditorContainer with basic functionality
2. Implement PhotoEditorContainer with basic functionality
3. Set up asset management and sharing between modes
4. Implement basic save/load functionality

### Phase 3: Feature Parity
1. Migrate existing video editing features to IMG.LY VideoEditor
2. Add photo editing capabilities
3. Integrate fal.ai generated content import
4. Implement export functionality for both modes

### Phase 4: Enhanced Features
1. Add advanced video editing features (transitions, effects)
2. Add advanced photo editing features (filters, adjustments)
3. Implement cross-mode asset usage (edited photos in videos)
4. Performance optimization and testing

### Phase 5: Cleanup and Optimization
1. Remove Remotion dependencies
2. Clean up unused code and components
3. Performance optimization
4. Final testing and bug fixes

## Performance Considerations

### SDK Loading Optimization
- **Lazy Loading**: Load SDKs only when their respective tabs are accessed
- **Code Splitting**: Split SDK bundles to reduce initial load time
- **Caching**: Cache SDK instances and reuse across sessions

### Memory Management
- **Asset Cleanup**: Properly dispose of unused media assets
- **SDK Cleanup**: Clean up SDK instances when switching modes
- **State Optimization**: Use efficient state management to prevent memory leaks

### Rendering Performance
- **Virtual Scrolling**: For large asset libraries
- **Debounced Updates**: For real-time editing operations
- **Optimized Re-renders**: Use React.memo and useMemo strategically