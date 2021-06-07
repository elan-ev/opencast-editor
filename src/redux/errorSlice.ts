import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { httpRequestState } from '../types';

interface error {
  error: boolean,
  errorMessage: string,
  errorDetails: httpRequestState["error"]
}

const initialState: error = {
  error: false,
  errorMessage: "Unknown error",
  errorDetails: "",
}

/**
 * Slice for the error page state
 */
export const errorSlice = createSlice({
  name: 'errorState',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<{
      error: error["error"],
      errorMessage: error["errorMessage"],
      errorDetails: error["errorDetails"]
    }>) => {
      state.error = action.payload.error;
      state.errorMessage = action.payload.errorMessage;
      state.errorDetails = action.payload.errorDetails;
    },
  }
})

export const { setError, } = errorSlice.actions

// Export Selectors
export const selectIsError = (state: { errorState: { error: error["error"] }; }) => state.errorState.error
export const selectErrorMessage = (state: { errorState: { errorMessage: error["errorMessage"] }; }) => state.errorState.errorMessage
export const selectErrorDetails = (state: { errorState: { errorDetails: error["errorDetails"] }; }) => state.errorState.errorDetails

export default errorSlice.reducer
