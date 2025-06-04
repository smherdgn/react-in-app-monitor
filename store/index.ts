import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

interface RequestState {
  lastStatus: number | null;
}

const initialState: RequestState = {
  lastStatus: null,
};

export const fetchPostThunk = createAsyncThunk('requests/fetchPost', async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  return response.status;
});

export const postPostThunk = createAsyncThunk('requests/postPost', async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }),
  });
  return response.status;
});

export const axiosGetThunk = createAsyncThunk('requests/axiosGet', async () => {
  const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
  return response.status;
});

export const axiosPostThunk = createAsyncThunk('requests/axiosPost', async () => {
  const response = await axios.post('https://jsonplaceholder.typicode.com/posts', {
    title: 'foo',
    body: 'bar',
    userId: 1,
  });
  return response.status;
});

const requestSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPostThunk.fulfilled, (state, action) => {
        state.lastStatus = action.payload;
      })
      .addCase(postPostThunk.fulfilled, (state, action) => {
        state.lastStatus = action.payload;
      })
      .addCase(axiosGetThunk.fulfilled, (state, action) => {
        state.lastStatus = action.payload;
      })
      .addCase(axiosPostThunk.fulfilled, (state, action) => {
        state.lastStatus = action.payload;
      });
  },
});

export const store = configureStore({
  reducer: {
    requests: requestSlice.reducer,
  },
});

export type AppDispatch = typeof store.dispatch;
