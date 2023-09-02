import type {
	Root,
	RootContent,
	Element as HastElementInterface,
	ElementContent as HastElementContent,
	Text as HastTextNodeInterface
} from "hast";

class HastElement implements HastElementInterface {
	public readonly type = "element";
	public children;
	public tagName;
	public properties?;
	constructor(
		tagName: string,
		options: {
			properties?: Record<
				any,
				string | number | boolean | (string | number)[] | null | undefined
			>;
			children?: HastElementContent[];
		}
	) {
		this.tagName = tagName;
		this.children = options.children ?? [];
		this.properties = options.properties;
	}
}

class HastTextNode implements HastTextNodeInterface {
	public readonly type = "text";
	public value: string;
	constructor(value: string) {
		this.value = value;
	}
}

const handleHeadings = (element: HastElement) => {
	const headingTags = ["h1", "h2", "h3", "h4", "h5"];
	if (!headingTags.includes(element.tagName)) return;
	const headingId = element.properties?.id
	if (!headingId) return
	if (!element.properties) {
		element.properties = {};
	}
	element.properties.id = headingId;
	element.properties.class = "relative block flex group"
	element.children.push(
		new HastElement("a", {
			properties: {
				href: `#${headingId}`,
				class: "w-4 -ml-5 pl-0.5 sm:pl-0 sm:-ml-6 absolute block group-hover:!text-main !text-zinc-200 shrink-0",
				"aria-label": "Permalink"
			},
			children: [new HastTextNode("#")]
		})
	);
};

const handleBlockquoteElement = (element: HastElement) => {
	if (element.tagName !== "blockquote") return;
	const pElement = element.children.find((child) => {
		if (child.type !== "element") return false;
		if (child.tagName !== "p") return false;
		return true;
	});
	if (pElement?.type !== "element") return;
	if (!element.properties) return;
	const firstTextContent = pElement.children.filter(
		(child): child is HastTextNode => child.type === "text"
	)[0];

	const classNames = [
		...(element.properties.class?.toString() ?? "").split(" "),
		"bg-default"
	];
	if (firstTextContent.value.startsWith("(warn)")) {
		classNames.push("bq-warn");
		firstTextContent.value = firstTextContent.value.replace("(warn)", "");
	}
	if (firstTextContent.value.startsWith("(red)")) {
		classNames.push("bq-red");
		firstTextContent.value = firstTextContent.value.replace("(red)", "");
	}
	element.properties.class = classNames.join(" ");
};

const wrapTableElement = (content: Root) => {
	const tableChildren = content.children
		.map((child, i) => {
			return [child, i] as const;
		})
		.filter(([child]) => child.type === "element" && child.tagName === "table");
	for (const [tableChild, position] of tableChildren) {
		if (tableChild.type !== "element") continue;
		const wrapperDivElement = new HastElement("div", {
			properties: {
				class: "table-wrapper"
			},
			children: [tableChild]
		});
		content.children[position] = wrapperDivElement;
	}
};

const parseContent = (content: Root | RootContent) => {
	if (content.type !== "element" && content.type !== "root") return;
	if (content.type === "root") {
		wrapTableElement(content);
	}
	if (content.type === "element") {
		handleBlockquoteElement(content);
		handleHeadings(content);
	}
	for (const children of content.children) {
		parseContent(children);
	}
};

const rehypePlugin = (root: Root) => {
	parseContent(root);
};

export default () => {
	const initializePlugin = () => rehypePlugin;
	return initializePlugin;
};
