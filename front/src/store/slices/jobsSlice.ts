/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axiosInstance';

export interface JobsState {
  items: any[];
  loading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  items: [],
  loading: false,
  error: null,
};

/**
 * Async Thunk لجلب الوظائف (Jobs) من الـ API
 */
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/jobs');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch jobs';
      return rejectWithValue(errorMessage);
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<any[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        // حسب الـ API، لو بيرجع array مباشرة أو object جواه array
        state.items = Array.isArray(action.payload) 
          ? action.payload 
          : action.payload.jobs || [];
        state.error = null;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setJobs, setLoading, setError } = jobsSlice.actions;
export default jobsSlice.reducer;