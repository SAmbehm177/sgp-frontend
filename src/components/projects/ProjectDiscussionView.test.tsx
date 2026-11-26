// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, refreshNotifications } = vi.hoisted(() => ({
  apiMock: {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
  },
  refreshNotifications: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn() }),
}));
vi.mock('../../context/NotificationsContext', () => ({
  useNotifications: () => ({ refresh: refreshNotifications }),
}));
vi.mock('../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  api: apiMock,
}));

import { ProjectDiscussionView } from './ProjectDiscussionView';

const page = {
  messages: [],
  aPlusAncien: false,
  suppressions: [],
  dernierIdSuppression: 0,
};

describe('ProjectDiscussionView polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMock.getMessages.mockReset().mockResolvedValue(page);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('uses short incremental requests instead of keeping a stream open', async () => {
    render(<ProjectDiscussionView projetId={3} canManage={false} membres={[]} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMock.getMessages).toHaveBeenCalledTimes(2);
    expect(apiMock.getMessages.mock.calls[1][0]).toBe(3);
    expect(apiMock.getMessages.mock.calls[1][1]).toMatchObject({
      apresId: 0,
      apresSuppressionId: 0,
      signal: expect.any(AbortSignal),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_999);
    });
    expect(apiMock.getMessages).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(apiMock.getMessages).toHaveBeenCalledTimes(3);
  });

  it('aborts an in-flight polling request when leaving the discussion', async () => {
    let signal: AbortSignal | undefined;
    apiMock.getMessages
      .mockResolvedValueOnce(page)
      .mockImplementationOnce((_projetId, options) => {
        signal = options.signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true }
          );
        });
      });

    const { unmount } = render(<ProjectDiscussionView projetId={3} canManage={false} membres={[]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
