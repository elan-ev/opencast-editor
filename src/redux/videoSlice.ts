import { createSlice, nanoid, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { client } from '../util/client'

import { Segment, httpRequestState, Track, Workflow }  from '../types'
import { roundToDecimalPlace } from '../util/utilityFunctions'
import { WritableDraft } from 'immer/dist/internal';
import { settings } from '../config';

export interface video {
  isPlaying: boolean,             // Are videos currently playing?
  isPlayPreview: boolean,         // Should deleted segments be skipped?
  previewTriggered: boolean,      // Basically acts as a callback for the video players.
  clickTriggered: boolean,        // Another video player callback
  currentlyAt: number,            // Position in the video in milliseconds
  segments: Segment[],
  tracks: Track[],
  activeSegmentIndex: number,     // Index of the segment that is currenlty hovered
  selectedWorkflowIndex: number,  // Index of the currently selected workflow
  aspectRatios: {width: number, height: number}[],  // Aspect ratios of every video
  hasChanges: boolean             // Did user make changes in cutting view since last save

  videoURLs: string[],  // Links to each video
  videoCount: number,   // Total number of videos
  duration: number,     // Video duration in milliseconds
  title: string,
  presenters: string[],
  workflows: Workflow[],
}

export const initialState: video & httpRequestState = {
  isPlaying: false,
  isPlayPreview: true,
  currentlyAt: 0,   // Position in the video in milliseconds
  segments: [{id: nanoid(), start: 0, end: 1, deleted: false}],
  tracks: [],
  activeSegmentIndex: 0,
  selectedWorkflowIndex: 0,
  previewTriggered: false,
  clickTriggered: false,
  aspectRatios: [],
  hasChanges: false,

  videoURLs: [],
  videoCount: 0,
  duration: 0,
  title: '',
  presenters: [],
  workflows: [],

  status: 'idle',
  error: undefined,
}

export const fetchVideoInformation = createAsyncThunk('video/fetchVideoInformation', async () => {
  if (!settings.mediaPackageId) {
    throw new Error("Missing mediaPackageId")
  }

  // const response = await client.get('https://legacy.opencast.org/admin-ng/tools/ID-dual-stream-demo/editor.json')
  const response = await client.get(`${settings.opencast.url}/editor/${settings.mediaPackageId}/edit.json`)
  return response
})

const updateCurrentlyAt = (state: video, milliseconds: number) => {
  state.currentlyAt = roundToDecimalPlace(milliseconds, 0);

  if (state.currentlyAt < 0) {
    state.currentlyAt = 0;
  }

  if (state.duration !== 0 && state.duration < state.currentlyAt) {
    state.currentlyAt = state.duration
  }

  updateActiveSegment(state);
  skipDeletedSegments(state);
};

/**
 * Slice for the state of the "video"
 * Treats the multitude of videos that may exist as one video
 */
export const videoSlice = createSlice({
  name: 'videoState',
  initialState,
  reducers: {
    setIsPlaying: (state, action: PayloadAction<video["isPlaying"]>) => {
      state.isPlaying = action.payload;
    },
    setIsPlayPreview: (state, action: PayloadAction<video["isPlaying"]>) => {
      state.isPlayPreview = action.payload;
    },
    setPreviewTriggered: (state, action) => {
      state.previewTriggered = action.payload
    },
    setClickTriggered: (state, action) => {
      state.clickTriggered = action.payload
    },
    setCurrentlyAt: (state, action: PayloadAction<video["currentlyAt"]>) => {
      updateCurrentlyAt(state, action.payload);
    },
    setCurrentlyAtInSeconds: (state, action: PayloadAction<video["currentlyAt"]>) => {
      updateCurrentlyAt(state, roundToDecimalPlace(action.payload * 1000, 0))
    },
    addSegment: (state, action: PayloadAction<video["segments"][0]>) => {
      state.segments.push(action.payload)
    },
    setAspectRatio: (state, action: PayloadAction<{dataKey: number} & {width: number, height: number}> ) => {
      state.aspectRatios[action.payload.dataKey] = {width: action.payload.width, height: action.payload.height}
    },
    setHasChanges: (state, action: PayloadAction<video["hasChanges"]>) => {
      state.hasChanges = action.payload
    },
    cut: (state) => {
      // If we're exactly between two segments, we can't split the current segment
      if (state.segments[state.activeSegmentIndex].start === state.currentlyAt ||
          state.segments[state.activeSegmentIndex].end === state.currentlyAt ) {
        return state;
      }

      // Make two (new) segments out of it
      let segmentA : Segment =  {id: nanoid(),
        start: state.segments[state.activeSegmentIndex].start,
        end: state.currentlyAt,
        deleted: state.segments[state.activeSegmentIndex].deleted}
      let segmentB : Segment =  {id: nanoid(),
        start: state.currentlyAt,
        end: state.segments[state.activeSegmentIndex].end,
        deleted: state.segments[state.activeSegmentIndex].deleted}

      // Add the new segments and remove the old one
      state.segments.splice(state.activeSegmentIndex, 1, segmentA, segmentB);

      state.hasChanges = true
    },
    markAsDeletedOrAlive: (state) => {
      state.segments[state.activeSegmentIndex].deleted = !state.segments[state.activeSegmentIndex].deleted
      state.hasChanges = true
    },
    setSelectedWorkflowIndex: (state, action: PayloadAction<video["selectedWorkflowIndex"]>) => {
      state.selectedWorkflowIndex = action.payload
    },
    mergeLeft: (state) => {
      mergeSegments(state, state.activeSegmentIndex, state.activeSegmentIndex - 1)
      state.hasChanges = true
    },
    mergeRight: (state) => {
      mergeSegments(state, state.activeSegmentIndex, state.activeSegmentIndex + 1)
      state.hasChanges = true
    },
  },
  // For Async Requests
  extraReducers: builder => {
    builder.addCase(
      fetchVideoInformation.pending, (state, action) => {
        state.status = 'loading'
    })
    builder.addCase(
      fetchVideoInformation.fulfilled, (state, action) => {
        state.status = 'success'

        // // Old API
        // // eslint-disable-next-line no-sequences
        // state.videoURLs = action.payload.previews.reduce((a: string[], o: { uri: string }) => (a.push(o.uri), a), [])
        // state.videoCount = action.payload.previews.length
        // state.duration = action.payload.duration
        // state.title = action.payload.title
        // state.presenters = action.payload.presenters
        // state.segments = parseSegments(action.payload.segments, action.payload.duration)
        // state.workflows = action.payload.workflows.sort((n1: { displayOrder: number; },n2: { displayOrder: number; }) => {
        //   if (n1.displayOrder > n2.displayOrder) { return 1; }
        //   if (n1.displayOrder < n2.displayOrder) { return -1; }
        //   return 0;
        // });

        // New API
        // eslint-disable-next-line no-sequences
        state.videoURLs = action.payload.tracks.reduce((a: string[], o: { uri: string }) => (a.push(o.uri), a), [])
        state.videoCount = state.videoURLs.length
        state.duration = action.payload.duration
        state.title = action.payload.title
        state.presenters = []
        state.segments = parseSegments(action.payload.segments, action.payload.duration)
        state.tracks = action.payload.tracks
        state.workflows = action.payload.workflows.sort((n1: { displayOrder: number; },n2: { displayOrder: number; }) => {
          if (n1.displayOrder > n2.displayOrder) { return 1; }
          if (n1.displayOrder < n2.displayOrder) { return -1; }
          return 0;
        });

        state.aspectRatios = new Array(state.videoCount)
    })
    builder.addCase(
      fetchVideoInformation.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ? JSON.parse(action.error.message) : ""
    })
  }
})

/**
 * Helper function to update the activeSegmentIndex
 * @param state
 */
const updateActiveSegment = (state: WritableDraft<video>) => {
  state.activeSegmentIndex = state.segments.findIndex(element =>
    element.start <= state.currentlyAt && element.end >= state.currentlyAt)
  // If there is an error, assume the first (the starting) segment
  if(state.activeSegmentIndex < 0) {
    state.activeSegmentIndex = 0
  }
}

/**
 * Helper Function for testing with current/old editor API
 */
export const parseSegments = (segments: Segment[], duration: number) => {
  let newSegments : Segment[] = []

  if (segments.length === 0) {
    newSegments.push({id: nanoid(), start: 0, end: duration, deleted: false})
  }

  segments.forEach((segment: Segment) => {
    newSegments.push({id: nanoid(), start: segment.start, end: segment.end, deleted: segment.deleted})
  });
  return newSegments
}

/**
 * Helper function for merging two segments
 */
const mergeSegments = (state: WritableDraft<video>, activeSegmentIndex: number, mergeSegmentIndex: number) => {
  // Check if mergeSegmentIndex is valid
  if (mergeSegmentIndex < 0 || mergeSegmentIndex > state.segments.length - 1) {
    return
  }

  // Increase activeSegment length
  state.segments[activeSegmentIndex].start = Math.min(
    state.segments[activeSegmentIndex].start, state.segments[mergeSegmentIndex].start)
  state.segments[activeSegmentIndex].end = Math.max(
    state.segments[activeSegmentIndex].end, state.segments[mergeSegmentIndex].end)

  // Remove the other segment
  state.segments.splice(mergeSegmentIndex, 1);

  // Update active segment
  updateActiveSegment(state)
}

const skipDeletedSegments = (state: WritableDraft<video>) => {
  if(state.isPlaying && state.segments[state.activeSegmentIndex].deleted && state.isPlayPreview) {
      let endTime = state.segments[state.activeSegmentIndex].end

      for (let index = state.activeSegmentIndex; index < state.segments.length; index++) {
        endTime = state.segments[index].end

        if (!state.segments[index].deleted) {
          // Need to at +1 as start and end of neighbouring segments are identical
          endTime = state.segments[index].start + 1
          break
        }
      }

      state.currentlyAt = endTime
      state.previewTriggered = true
      updateActiveSegment(state);
    }
}

/**
 * Calculates a total aspect ratio for the video player wrappers,
 * based on the aspect ratio of all videos.
 * Returns the total aspect ratio in percent,
 * or returns a default aspect ratio to limit the height of the video player area
 * TODO: Error checking
 * TODO: Improve calculation to handle multiple rows of videos
 */
const calculateTotalAspectRatio = (aspectRatios: video["aspectRatios"]) => {
  let minHeight = Math.min.apply(Math, aspectRatios.map(function(o) { return o.height; }))
  let minWidth = Math.min.apply(Math, aspectRatios.map(function(o) { return o.width; }))
  minWidth *= aspectRatios.length
  return Math.min((minHeight / minWidth) * 100, (9/32) * 100)
}

export const { setIsPlaying, setIsPlayPreview, setCurrentlyAt, setCurrentlyAtInSeconds, addSegment, setAspectRatio,
  setHasChanges, cut, markAsDeletedOrAlive, setSelectedWorkflowIndex, mergeLeft, mergeRight, setPreviewTriggered,
  setClickTriggered } = videoSlice.actions

// Export selectors
// Selectors mainly pertaining to the video state
export const selectIsPlaying = (state: { videoState: { isPlaying: video["isPlaying"] }; }) =>
  state.videoState.isPlaying
export const selectIsPlayPreview = (state: { videoState: { isPlayPreview: video["isPlayPreview"] }; }) =>
  state.videoState.isPlayPreview
export const selectPreviewTriggered = (state: { videoState: { previewTriggered: video["previewTriggered"] } }) =>
  state.videoState.previewTriggered
export const selectClickTriggered = (state: { videoState: { clickTriggered: video["clickTriggered"] } }) =>
  state.videoState.clickTriggered
export const selectCurrentlyAt = (state: { videoState: { currentlyAt: video["currentlyAt"]; }; }) =>
  state.videoState.currentlyAt
export const selectCurrentlyAtInSeconds = (state: { videoState: { currentlyAt: video["currentlyAt"]; }; }) =>
  state.videoState.currentlyAt / 1000
export const selectSegments = (state: { videoState: { segments: video["segments"] } }) =>
  state.videoState.segments
export const selectActiveSegmentIndex = (state: { videoState: { activeSegmentIndex: video["activeSegmentIndex"]; }; }) =>
  state.videoState.activeSegmentIndex
export const selectIsCurrentSegmentAlive = (state: { videoState:
  { segments: { [x: number]: { deleted: boolean; }; }; activeSegmentIndex: video["activeSegmentIndex"]; }; }) =>
  !state.videoState.segments[state.videoState.activeSegmentIndex].deleted
export const selectSelectedWorkflowIndex = (state: { videoState:
  { selectedWorkflowIndex: video["selectedWorkflowIndex"]; }; }) =>
  state.videoState.selectedWorkflowIndex
export const hasChanges = (state: { videoState: { hasChanges: video["hasChanges"]; }; }) =>
  state.videoState.hasChanges

// Selectors mainly pertaining to the information fetched from Opencast
export const selectVideoURL = (state: { videoState: { videoURLs: video["videoURLs"] } }) => state.videoState.videoURLs
export const selectVideoCount = (state: { videoState: { videoCount: video["videoCount"] } }) => state.videoState.videoCount
export const selectDuration = (state: { videoState: { duration: video["duration"] } }) => state.videoState.duration
export const selectDurationInSeconds = (state: { videoState: { duration: video["duration"] } }) => state.videoState.duration / 1000
export const selectTitle = (state: { videoState: { title: video["title"] } }) => state.videoState.title
export const selectPresenters = (state: { videoState: { presenters: video["presenters"] } }) => state.videoState.presenters
export const selectTracks = (state: { videoState: { tracks: video["tracks"] } }) =>
  state.videoState.tracks
export const selectWorkflows = (state: { videoState: { workflows: video["workflows"] } }) => state.videoState.workflows
export const selectAspectRatio = (state: { videoState: { aspectRatios: video["aspectRatios"] } }) =>
  calculateTotalAspectRatio(state.videoState.aspectRatios)

export default videoSlice.reducer
