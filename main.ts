import {
	App,
	MarkdownPostProcessorContext,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "apiKey",
};

let apiKey = "";

const makeToDoistRequest = async (
	url: string,
	method: string,
	body?: string
) => {
	const headers: Headers = new Headers();
	headers.set("Content-Type", "application/json");
	headers.set("Accept", "application/json");
	headers.set("Authorization", "Bearer " + apiKey);

	const request: RequestInfo = new Request(url, {
		method: method,
		headers: headers,
		body: body,
	});

	return fetch(request)
		.then((res) => res.json())
		.then((res) => {
			return res;
		});
};

const createRequest = async () => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks?filter=overdue",
		"GET"
	);
};

const updateTask = async (id: string, postpone: string) => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks/" + id + "/close",
		"POST",
		JSON.stringify({
			due_string: postpone,
		})
	);
};

const completeTask = async (id: string, postpone: string) => {
	return makeToDoistRequest(
		"https://api.todoist.com/rest/v2/tasks/" + id,
		"POST"
	);
};

const changeButtonColor = (buttonID: string, id: string) => {
	let button = document.getElementById(buttonID)!;

	const accent = getComputedStyle(button).getPropertyValue("--color-accent");
	const color = getComputedStyle(button).getPropertyValue(
		"--interactive-normal"
	);

	["week", "tomorrow", "today"].forEach((b) => {
		let current = document.getElementById(id + "-" + b + "-button")!;
		current.style.backgroundColor = color;
	});

	button.style.backgroundColor = accent;
};

const buttonClicker = (buttonID: string, id: string, postpone: string) => {
	return () => {
		changeButtonColor(buttonID, id);
		updateTask(id, postpone);
	};
};

const convertTaskToHTML = (data: any): any => {
	const main = document.createElement("div");
	main.style.marginBottom = "1em";

	const text = document.createElement("div");
	text.style.marginBottom = "0.5em";
	text.textContent = data["content"];
	main.appendChild(text);

	const week = document.createElement("button");
	week.style.marginRight = "1.5em";
	week.textContent = "Next Week";
	const weekID = data["id"] + "-week-button";
	week.id = weekID;
	week.onClickEvent(buttonClicker(weekID, data["id"], "next week"));

	const tomorrow = document.createElement("button");
	tomorrow.style.marginRight = "1.5em";
	tomorrow.textContent = "Tomorrow";
	const tomorrowID = data["id"] + "-tomorrow-button";
	tomorrow.id = tomorrowID;
	tomorrow.onClickEvent(buttonClicker(tomorrowID, data["id"], "tomorrow"));

	const today = document.createElement("button");
	today.textContent = "Today";
	const todayID = data["id"] + "-today-button";
	today.id = todayID;
	today.onClickEvent(buttonClicker(todayID, data["id"], "today"));

	main.appendChild(week);
	main.appendChild(tomorrow);
	main.appendChild(today);
	return main;
};

const codeProcessor = async (
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	const main = document.createElement("p");
	const data = await createRequest();
	data.map((d: any): any => main.appendChild(convertTaskToHTML(d)));

	el.appendChild(main);
	return;
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		apiKey = this.settings.mySetting;

		this.registerMarkdownCodeBlockProcessor(
			"todoist-review",
			codeProcessor
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
