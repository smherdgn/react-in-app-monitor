import axios from 'axios';
import {
  fetchPostThunk,
  postPostThunk,
  axiosGetThunk,
  axiosPostThunk,
  store,
} from './index';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mockWindow,
  jest as customJest,
  MockFunction,
} from '../test-utils/test-helpers';

describe('store thunks', () => {
  let mockWin: ReturnType<typeof mockWindow>;
  let fetchMock: MockFunction<any>;
  let axiosGetSpy: MockFunction<any>;
  let axiosPostSpy: MockFunction<any>;

  beforeEach(() => {
    mockWin = mockWindow();
    fetchMock = mockWin.fetch as any;
    fetchMock.mock.mockClear();
    axiosGetSpy = customJest.spyOn(axios, 'get');
    axiosPostSpy = customJest.spyOn(axios, 'post');
    axiosGetSpy.mock.mockClear();
    axiosPostSpy.mock.mockClear();
    store.dispatch({ type: fetchPostThunk.fulfilled.type, payload: null });
  });

  afterEach(() => {
    axiosGetSpy.mock.mockRestore?.();
    axiosPostSpy.mock.mockRestore?.();
  });

  it('fetchPostThunk should perform GET request and update lastStatus', async () => {
    const response = new mockWin.Response(null, { status: 200 });
    fetchMock.mock.mockResolvedValueOnce(response);

    await store.dispatch(fetchPostThunk());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/posts/1');
    expect(store.getState().requests.lastStatus).toBe(200);
  });

  it('postPostThunk should perform POST request and update lastStatus', async () => {
    const response = new mockWin.Response(null, { status: 201 });
    fetchMock.mock.mockResolvedValueOnce(response);

    await store.dispatch(postPostThunk());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('https://jsonplaceholder.typicode.com/posts');
    expect(call[1]).toMatchObject({ method: 'POST' });
    expect(store.getState().requests.lastStatus).toBe(201);
  });

  it('axiosGetThunk should perform axios GET request and update lastStatus', async () => {
    axiosGetSpy.mock.mockResolvedValueOnce({ status: 202 });

    await store.dispatch(axiosGetThunk());

    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
    expect(axiosGetSpy).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/posts/1');
    expect(store.getState().requests.lastStatus).toBe(202);
  });

  it('axiosPostThunk should perform axios POST request and update lastStatus', async () => {
    axiosPostSpy.mock.mockResolvedValueOnce({ status: 203 });

    await store.dispatch(axiosPostThunk());

    expect(axiosPostSpy).toHaveBeenCalledTimes(1);
    const call = axiosPostSpy.mock.calls[0];
    expect(call[0]).toBe('https://jsonplaceholder.typicode.com/posts');
    expect(call[1]).toEqual({ title: 'foo', body: 'bar', userId: 1 });
    expect(store.getState().requests.lastStatus).toBe(203);
  });
});
