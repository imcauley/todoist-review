import {
	App,
	MarkdownPostProcessorContext,
	Plugin,
	PluginSettingTab,
	Setting,
	requestUrl,
	type RequestUrlParam,
} from "obsidian";

interface TodoistReviewSettings {
	todoistApiKey: string;
}

const TODOIST_REVIEW_SETTINGS: TodoistReviewSettings = {
	todoistApiKey: "apiKey",
};

let apiKey = "";

const makeToDoistRequest = async (
	url: string,
	method: string,
	body?: string
) => {
	const requestParams: RequestUrlParam = {
		url: url,
		method: method,
		body: body,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
	};

	if (method === "GET") {
		return requestUrl(requestParams)
			.then((res) => res.json)
			.then((res) => {
				return res;
			});
	} else {
		requestUrl(requestParams);
	}
};

const createRequest = async () => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks?filter=overdue",
		"GET"
	);
};

const updateTask = async (id: string, postpone: string) => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks/" + id,
		"POST",
		JSON.stringify({
			due_string: postpone,
		})
	);
};

const completeTask = async (id: string) => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks/" + id + "/close",
		"POST"
	);
};

const changeButtonColor = (buttonID: string, id: string) => {
	let button = document.getElementById(buttonID)!;

	["week", "tomorrow", "today", "complete"].forEach((b) => {
		let current = document.getElementById(id + "-" + b + "-button")!;
		current.classList.remove("todoist-review-active-button");
	});

	button.classList.add("todoist-review-active-button");
};

const completeButton = (buttonID: string, id: string) => {
	return () => {
		changeButtonColor(buttonID, id);
		completeTask(id);
	};
};

const buttonClicker = (buttonID: string, id: string, postpone: string) => {
	return () => {
		changeButtonColor(buttonID, id);
		updateTask(id, postpone);
	};
};

const convertTaskToHTML = (data: any): any => {
	const main = document.createElement("div");
	main.classList.add("todoist-review-container");

	const text = document.createElement("div");
	text.classList.add("todoist-review-text");
	text.textContent = data["content"];
	main.appendChild(text);

	const week = document.createElement("button");
	week.classList.add("todoist-review-button");
	week.textContent = "Next Week";
	const weekID = data["id"] + "-week-button";
	week.id = weekID;
	week.onClickEvent(buttonClicker(weekID, data["id"], "next week"));

	const tomorrow = document.createElement("button");
	tomorrow.classList.add("todoist-review-button");
	tomorrow.textContent = "Tomorrow";
	const tomorrowID = data["id"] + "-tomorrow-button";
	tomorrow.id = tomorrowID;
	tomorrow.onClickEvent(buttonClicker(tomorrowID, data["id"], "tomorrow"));

	const today = document.createElement("button");
	today.textContent = "Today";
	today.classList.add("todoist-review-button");
	const todayID = data["id"] + "-today-button";
	today.id = todayID;
	today.onClickEvent(buttonClicker(todayID, data["id"], "today"));

	const complete = document.createElement("button");
	complete.textContent = "Complete";
	complete.classList.add("todoist-review-button");
	const completeID = data["id"] + "-complete-button";
	complete.id = completeID;
	complete.onClickEvent(completeButton(completeID, data["id"]));

	main.appendChild(week);
	main.appendChild(tomorrow);
	main.appendChild(today);
	main.appendChild(complete);
	return main;
};

const codeProcessor = async (
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	const main = document.createElement("p");
	el.appendChild(main);

	if (apiKey === "" || apiKey === "apiKey") {
		const text = document.createElement("div");
		text.textContent = "Please enter a valid API Key in the settings";
		main.appendChild(text);
		return;
	}

	const data: [any] = await createRequest();

	if (data.length < 1) {
		const text = document.createElement("div");
		text.textContent = "All caught up 😄";
		main.appendChild(text);
	} else {
		data.map((d: any): any => main.appendChild(convertTaskToHTML(d)));
	}

	return;
};

export default class TodoistReviewPlugin extends Plugin {
	settings: TodoistReviewSettings;

	async onload() {
		await this.loadSettings();
		apiKey = this.settings.todoistApiKey;

		this.registerMarkdownCodeBlockProcessor(
			"todoist-review",
			codeProcessor
		);

		this.addSettingTab(new TodoistReviewSettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			TODOIST_REVIEW_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TodoistReviewSettingsTab extends PluginSettingTab {
	plugin: TodoistReviewPlugin;

	constructor(app: App, plugin: TodoistReviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Todoist API Key")
			.setDesc("")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.todoistApiKey)
					.onChange(async (value) => {
						this.plugin.settings.todoistApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
