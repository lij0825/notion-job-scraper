import { create } from 'zustand';
import { browser } from 'wxt/browser';
import type { JobData, ScrapeResponse, BackgroundResponse, BackgroundMessage } from '../utils/types';

export type ActiveView = 'loading' | 'scraping' | 'settings';
export type SelectableField = 'title' | 'company' | 'deadline' | 'url' | 'description';
export type FieldSelectionMap = Record<SelectableField, boolean>;

const REQUIRED_FIELDS: ReadonlySet<SelectableField> = new Set(['title', 'url']);

const DEFAULT_SELECTION: FieldSelectionMap = {
	title: true,
	company: true,
	deadline: true,
	url: true,
	description: true,
};

async function sendToBackground<T>(message: BackgroundMessage): Promise<BackgroundResponse<T>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

export interface JobState {
	activeView: ActiveView;
	jobData: JobData | null;
	editableData: JobData | null;
	selectedFields: FieldSelectionMap;
	scrapeError: string | null;
	isRefreshing: boolean;
	saveStatus: 'idle' | 'saving' | 'success' | 'error';
	saveError: string | null;

	// Actions
	setActiveView: (view: ActiveView) => void;
	setJobData: (data: JobData | null) => void;
	updateField: <K extends keyof JobData>(field: K, value: JobData[K]) => void;
	toggleField: (field: SelectableField) => void;
	executeLiveScrape: () => Promise<void>;
	saveToNotion: () => Promise<boolean>;
	resetSaveStatus: () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
	activeView: 'loading',
	jobData: null,
	editableData: null,
	selectedFields: { ...DEFAULT_SELECTION },
	scrapeError: null,
	isRefreshing: false,
	saveStatus: 'idle',
	saveError: null,

	setActiveView: (view) => set({ activeView: view }),

	setJobData: (data) => {
		if (data) {
			set({
				jobData: data,
				editableData: { ...data },
				selectedFields: { ...DEFAULT_SELECTION },
				scrapeError: null,
			});
		} else {
			set({
				jobData: null,
				editableData: null,
			});
		}
	},

	updateField: (field, value) => {
		set((state) => {
			if (!state.editableData) return state;
			return {
				editableData: { ...state.editableData, [field]: value },
			};
		});
	},

	toggleField: (field) => {
		if (REQUIRED_FIELDS.has(field)) return;
		set((state) => ({
			selectedFields: {
				...state.selectedFields,
				[field]: !state.selectedFields[field],
			},
		}));
	},

	executeLiveScrape: async () => {
		set({ isRefreshing: true, scrapeError: null });

		try {
			const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
			if (!activeTab?.id) {
				set({
					jobData: null,
					editableData: null,
					scrapeError: '활성화된 탭을 찾을 수 없습니다.',
					isRefreshing: false,
				});
				return;
			}

			const response = (await browser.tabs.sendMessage(activeTab.id, {
				type: 'SCRAPE',
			})) as ScrapeResponse;

			if (response?.success) {
				set({
					jobData: response.data,
					editableData: { ...response.data },
					selectedFields: { ...DEFAULT_SELECTION },
					scrapeError: null,
					isRefreshing: false,
				});
			} else {
				await browser.storage.local.remove('jobData');
				set({
					jobData: null,
					editableData: null,
					scrapeError: response ? response.error : '채용 공고 데이터를 찾을 수 없습니다.',
					isRefreshing: false,
				});
			}
		} catch {
			await browser.storage.local.remove('jobData');
			set({
				jobData: null,
				editableData: null,
				scrapeError: '채용 공고 페이지에서 모달을 연 뒤 다시 시도해 주세요.',
				isRefreshing: false,
			});
		}
	},

	saveToNotion: async () => {
		const { editableData, selectedFields } = get();
		if (!editableData) return false;

		set({ saveStatus: 'saving', saveError: null });

		const dataToSave: JobData = {
			title: editableData.title,
			company: selectedFields.company ? editableData.company : '',
			url: editableData.url,
			deadline: selectedFields.deadline ? editableData.deadline : null,
			description: selectedFields.description ? editableData.description : '',
			site: editableData.site,
		};

		try {
			const response = await sendToBackground<{ pageId: string }>({
				type: 'SAVE_TO_NOTION',
				payload: dataToSave,
			});

			if (response.success) {
				set({ saveStatus: 'success' });
				setTimeout(() => {
					set({ saveStatus: 'idle' });
				}, 3000);
				return true;
			}

			set({
				saveStatus: 'error',
				saveError: response.error || '저장 중 오류가 발생했습니다.',
			});
			return false;
		} catch (err) {
			const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
			set({ saveStatus: 'error', saveError: msg });
			return false;
		}
	},

	resetSaveStatus: () => set({ saveStatus: 'idle', saveError: null }),
}));
