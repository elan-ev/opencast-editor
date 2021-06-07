import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { client } from '../util/client'

import { httpRequestState }  from '../types'
import { settings } from '../config';

export interface Catalog {
  fields: MetadataField[],
  flavor: string, // "dublincore/episode"
  title: string,  // name identifier
}

export interface MetadataField {
  readOnly: boolean,
  id: string      // name
  label: string   // name identifier
  type: string    // irrelevant?
  value: string,
  required: boolean,
  collection: any | undefined,
}

// interface metadata {
//   title: string,
//   subject: string,
//   description: string,
//   language: string,
//   languageOptions: string[],
//   rightsHolder: string,
//   license: string,
//   licenseOptions: string[],
//   isPartOf: string,
//   creator: string,
//   creatorOptions: string[],
//   contributor: string,
//   contributorOptions: string[],
//   startDate: Date,
//   duration: string,
//   location: string,
//   source: string,
//   created: Date,
//   publisher: string,
//   identifier: string,
// }

interface metadata {
  catalogs: Catalog[]
  hasChanges: boolean         // Did user make changes to metadata view since last save
}

interface postRequestState {
  postStatus: 'idle' | 'loading' | 'success' | 'failed',
  postError: string | undefined,
}

// TODO: Create an 'httpRequestState' array or something
const initialState: metadata & httpRequestState & postRequestState = {
  catalogs: [],
  hasChanges: false,

  status: 'idle',
  error: undefined,

  postStatus: 'idle',
  postError: undefined,
}

export const fetchMetadata = createAsyncThunk('metadata/fetchMetadata', async () => {
  if (!settings.mediaPackageId) {
    throw new Error("Missing mediaPackageId")
  }

  const response = await client.get(`${settings.opencast.url}/editor/${settings.mediaPackageId}/metadata.json`)
  return response
})

export const postMetadata = createAsyncThunk('metadata/postMetadata', async (_, { getState }) => {
  if (!settings.mediaPackageId) {
    throw new Error("Missing mediaPackageId")
  }

  // TODO: Get only metadataState instead of all states
  const allStates = getState() as { metadataState: { catalogs: metadata["catalogs"] } }

  const response = await client.post(`${settings.opencast.url}/editor/${settings.mediaPackageId}/metadata.json`,
    allStates.metadataState.catalogs
  )

  return response
})

/**
 * Slice for managing a post request for saving current changes and starting a workflow
 */
const metadataSlice = createSlice({
  name: 'metadataState',
  initialState,
  reducers: {
    setFieldValue: (state, action: any) => {
      state.catalogs[action.payload.catalogIndex].fields[action.payload.fieldIndex].value = action.payload.value
      state.hasChanges = true
    },
    setHasChanges: (state, action: PayloadAction<metadata["hasChanges"]>) => {
      state.hasChanges = action.payload
    }
  },
  extraReducers: builder => {
    builder.addCase(
      fetchMetadata.pending, (state, action) => {
        state.status = 'loading'
    })
    builder.addCase(
      fetchMetadata.fulfilled, (state, action) => {
        state.catalogs = action.payload

        state.status = 'success'
    })
    builder.addCase(
      fetchMetadata.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ? JSON.parse(action.error.message) : ""
    })
    builder.addCase(
      postMetadata.pending, (state, action) => {
        state.postStatus = 'loading'
    })
    builder.addCase(
      postMetadata.fulfilled, (state, action) => {
        state.postStatus = 'success'
    })
    builder.addCase(
      postMetadata.rejected, (state, action) => {
        state.postStatus = 'failed'
        state.postError = action.error.message ? JSON.parse(action.error.message) : ""
    })
  }
})

export const { setFieldValue, setHasChanges } = metadataSlice.actions

export const selectCatalogs = (state: { metadataState: { catalogs: metadata["catalogs"] } }) =>
  state.metadataState.catalogs
export const hasChanges = (state: { metadataState: { hasChanges: metadata["hasChanges"] } }) =>
  state.metadataState.hasChanges
export const selectGetStatus = (state: { metadataState: { status: httpRequestState["status"] } }) =>
  state.metadataState.status
export const selectGetError = (state: { metadataState: { error: httpRequestState["error"] } }) =>
  state.metadataState.error
export const selectPostStatus = (state: { metadataState: { postStatus: postRequestState["postStatus"] } }) =>
  state.metadataState.postStatus
export const selectPostError = (state: { metadataState: { postError: postRequestState["postError"] } }) =>
  state.metadataState.postError

export const selectTitleFromEpisodeDc = (state: { metadataState: { catalogs: metadata["catalogs"] } }) => {
  for (const catalog of state.metadataState.catalogs) {
    if (catalog.flavor === "dublincore/episode") {
      for (const field of catalog.fields) {
        if (field.id === "title") {
          return field.value
        }
      }
    }
  }

  return undefined
}

export default metadataSlice.reducer
