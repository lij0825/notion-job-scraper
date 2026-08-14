import '@testing-library/jest-dom';
import { vi } from 'vitest';

// In-memory browser.storage mock implementation
interface StorageItems {
	[key: string]: unknown;
}

const createStorageArea = () => {
	let store: StorageItems = {};
	return {
		get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
			if (!keys) {
				return { ...store };
			}
			if (typeof keys === 'string') {
				return { [keys]: store[keys] };
			}
			if (Array.isArray(keys)) {
				const result: StorageItems = {};
				for (const k of keys) {
					if (k in store) {
						result[k] = store[k];
					}
				}
				return result;
			}
			const result: StorageItems = { ...keys };
			for (const k of Object.keys(keys)) {
				if (k in store) {
					result[k] = store[k];
				}
			}
			return result;
		}),
		set: vi.fn(async (items: StorageItems) => {
			store = { ...store, ...items };
		}),
		remove: vi.fn(async (keys: string | string[]) => {
			const keysToRemove = Array.isArray(keys) ? keys : [keys];
			for (const k of keysToRemove) {
				delete store[k];
			}
		}),
		clear: vi.fn(async () => {
			store = {};
		}),
		// Helper for test resets
		__reset: () => {
			store = {};
		},
	};
};

const storageLocal = createStorageArea();
const storageSync = createStorageArea();

const mockBrowser = {
	storage: {
		local: storageLocal,
		sync: storageSync,
	},
	runtime: {
		sendMessage: vi.fn(),
		onMessage: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
			hasListener: vi.fn(),
		},
		getURL: vi.fn((path: string) => `moz-extension://mock-extension-id/${path}`),
		id: 'notion-job-scraper@lij0825.com',
	},
	tabs: {
		query: vi.fn(async () => [{ id: 1, url: 'https://www.wanted.co.kr/wd/12345' }]),
		sendMessage: vi.fn(),
		create: vi.fn(),
	},
	identity: {
		launchWebAuthFlow: vi.fn(),
		getRedirectURL: vi.fn((path = '') => `https://notion-job-scraper.chromiumapp.org/${path}`),
	},
};

// Global browser and chrome assignment for Firefox & Chrome MV3 environments
Object.defineProperty(globalThis, 'browser', {
	value: mockBrowser,
	writable: true,
});

Object.defineProperty(globalThis, 'chrome', {
	value: mockBrowser,
	writable: true,
});
