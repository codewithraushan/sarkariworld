import { Editor, Extension, Node } from "https://esm.sh/@tiptap/core@2.22.2";
import StarterKit from "https://esm.sh/@tiptap/starter-kit@2.22.2";
import Link from "https://esm.sh/@tiptap/extension-link@2.22.2";
import Underline from "https://esm.sh/@tiptap/extension-underline@2.22.2";
import Highlight from "https://esm.sh/@tiptap/extension-highlight@2.22.2";
import TextStyle from "https://esm.sh/@tiptap/extension-text-style@2.22.2";
import Color from "https://esm.sh/@tiptap/extension-color@2.22.2";
import TextAlign from "https://esm.sh/@tiptap/extension-text-align@2.22.2";
import Image from "https://esm.sh/@tiptap/extension-image@2.22.2";
import Youtube from "https://esm.sh/@tiptap/extension-youtube@2.22.2";
import Table from "https://esm.sh/@tiptap/extension-table@2.22.2";
import TableRow from "https://esm.sh/@tiptap/extension-table-row@2.22.2";
import TableHeader from "https://esm.sh/@tiptap/extension-table-header@2.22.2";
import TableCell from "https://esm.sh/@tiptap/extension-table-cell@2.22.2";
import TaskList from "https://esm.sh/@tiptap/extension-task-list@2.22.2";
import TaskItem from "https://esm.sh/@tiptap/extension-task-item@2.22.2";

const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

const InstagramEmbed = Node.create({
  name: "instagramEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      permalink: {
        default: "",
      },
      captioned: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "blockquote.instagram-media[data-instgrm-permalink]",
        getAttrs: (element) => ({
          permalink: element.getAttribute("data-instgrm-permalink") || "",
          captioned: element.hasAttribute("data-instgrm-captioned"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const permalink = String(HTMLAttributes.permalink || "").trim();
    const captioned = Boolean(HTMLAttributes.captioned);

    return [
      "blockquote",
      {
        class: "instagram-media",
        "data-instgrm-permalink": permalink,
        "data-instgrm-version": "14",
        ...(captioned ? { "data-instgrm-captioned": "" } : {}),
        style:
          "background:#FFF;border:0;border-radius:3px;box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);margin:1px auto;max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px);",
      },
      [
        "a",
        {
          href: permalink,
          target: "_blank",
          rel: "noopener noreferrer",
          style:
            "background:#FFFFFF;line-height:0;padding:0 0;text-align:center;text-decoration:none;width:100%;display:block;",
        },
        "View this post on Instagram",
      ],
    ];
  },

  addCommands() {
    return {
      setInstagramEmbed:
        (options) =>
        ({ commands }) => {
          const permalink = String(options?.permalink || "").trim();

          if (!permalink) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              permalink,
              captioned: true,
            },
          });
        },
    };
  },
});

const editorElement = document.getElementById("editor");
const statusElement = document.getElementById("status");
const postIdInput = document.getElementById("postId");
const postTitleInput = document.getElementById("postTitle");
const postSlugInput = document.getElementById("postSlug");
const postCategoryInput = document.getElementById("postCategory");
const postDescriptionInput = document.getElementById("postDescription");
const postTagsInput = document.getElementById("postTags");
const postPublishedAtInput = document.getElementById("postPublishedAt");
const seoScoreElement = document.getElementById("seoScore");
const seoWordCountElement = document.getElementById("seoWordCount");
const seoTitleItem = document.getElementById("seoTitleItem");
const seoDescriptionItem = document.getElementById("seoDescriptionItem");
const seoSlugItem = document.getElementById("seoSlugItem");
const seoH2Item = document.getElementById("seoH2Item");
const seoImageAltItem = document.getElementById("seoImageAltItem");
const seoWordItem = document.getElementById("seoWordItem");
const headingSelect = document.getElementById("headingSelect");
const underlineBtn = document.getElementById("underlineBtn");
const strikeBtn = document.getElementById("strikeBtn");
const highlightBtn = document.getElementById("highlightBtn");
const colorInput = document.getElementById("colorInput");
const applyColorBtn = document.getElementById("applyColorBtn");
const clearColorBtn = document.getElementById("clearColorBtn");
const orderedBtn = document.getElementById("orderedBtn");
const taskListBtn = document.getElementById("taskListBtn");
const quoteBtn = document.getElementById("quoteBtn");
const codeBlockBtn = document.getElementById("codeBlockBtn");
const hrBtn = document.getElementById("hrBtn");
const leftAlignBtn = document.getElementById("leftAlignBtn");
const centerAlignBtn = document.getElementById("centerAlignBtn");
const rightAlignBtn = document.getElementById("rightAlignBtn");
const linkBtn = document.getElementById("linkBtn");
const unlinkBtn = document.getElementById("unlinkBtn");
const imageBtn = document.getElementById("imageBtn");
const videoBtn = document.getElementById("videoBtn");
const instagramBtn = document.getElementById("instagramBtn");
const tableAddBtn = document.getElementById("tableAddBtn");
const tableRowAddBtn = document.getElementById("tableRowAddBtn");
const tableColAddBtn = document.getElementById("tableColAddBtn");
const tableDeleteRowBtn = document.getElementById("tableDeleteRowBtn");
const tableDeleteColBtn = document.getElementById("tableDeleteColBtn");
const tableDeleteBtn = document.getElementById("tableDeleteBtn");
const saveBtn = document.getElementById("saveBtn");
const saveAnyBtn = document.getElementById("saveAnyBtn");
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const bulletBtn = document.getElementById("bulletBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const initialPost =
  window.__EDITOR_INITIAL_POST && typeof window.__EDITOR_INITIAL_POST === "object"
    ? window.__EDITOR_INITIAL_POST
    : {};

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

let slugManuallyChanged = false;

function processInstagramEmbeds() {
  if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === "function") {
    window.instgrm.Embeds.process();
  }
}

const editor = new Editor({
  element: editorElement,
  extensions: [
    StarterKit,
    InstagramEmbed,
    Link.configure({
      openOnClick: true,
      autolink: true,
      defaultProtocol: "https",
    }),
    Underline,
    Highlight,
    TextStyle,
    FontSize,
    Color,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Image.configure({ inline: false }),
    Youtube.configure({
      controls: true,
      nocookie: true,
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
  ],
  content: initialPost.html_content || "<p>Start writing here...</p>",
});

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#9b1c1c" : "#14345f";
}

function canUseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function getInstagramEmbedMeta(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    const isInstagramHost = /(^|\.)instagram\.com$/i.test(parsed.hostname);

    if (!isInstagramHost) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const type = parts[0];
    const shortcode = parts[1];

    if (!type || !shortcode) {
      return null;
    }

    if (!["p", "reel", "tv"].includes(type)) {
      return null;
    }

    const safeShortcode = String(shortcode).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeShortcode) {
      return null;
    }

    return {
      permalink: `https://www.instagram.com/${type}/${safeShortcode}/?utm_source=ig_embed&utm_campaign=loading`,
    };
  } catch (error) {
    return null;
  }
}

function setChecklistItemState(element, isPass) {
  if (!element) {
    return;
  }

  element.classList.remove("seo-pass", "seo-fail");
  element.classList.add(isPass ? "seo-pass" : "seo-fail");
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function optimizeHtmlForSeo(rawHtml, title) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml || "", "text/html");

  if (!doc.querySelector("h1") && title) {
    const firstNode = doc.body.firstElementChild;
    const h1 = doc.createElement("h1");
    h1.textContent = title;

    if (firstNode) {
      doc.body.insertBefore(h1, firstNode);
    } else {
      doc.body.appendChild(h1);
    }
  }

  doc.querySelectorAll("img").forEach((img, index) => {
    const currentAlt = img.getAttribute("alt");
    if (!currentAlt || !currentAlt.trim()) {
      const fallbackAlt = title ? `${title} image ${index + 1}` : `image ${index + 1}`;
      img.setAttribute("alt", fallbackAlt);
    }

    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  });

  return doc.body.innerHTML;
}

function getSeoChecks() {
  const title = postTitleInput.value.trim();
  const description = postDescriptionInput.value.trim();
  const slug = postSlugInput.value.trim();
  const html = editor.getHTML();
  const text = editor.getText();
  const wordCount = countWords(text);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const hasH2 = !!doc.querySelector("h2");
  const imagesWithoutAlt = Array.from(doc.querySelectorAll("img")).filter((img) => {
    const alt = img.getAttribute("alt");
    return !alt || !alt.trim();
  }).length;

  return {
    titleLengthOk: title.length >= 40 && title.length <= 65,
    descriptionLengthOk: description.length >= 120,
    slugLengthOk: slug.length >= 3 && slug.length <= 120,
    hasH2,
    imagesAltOk: imagesWithoutAlt === 0,
    wordCountOk: wordCount >= 300,
    wordCount,
  };
}

function updateSeoChecklist() {
  if (!seoScoreElement) {
    return;
  }

  const checks = getSeoChecks();
  const items = [
    checks.titleLengthOk,
    checks.descriptionLengthOk,
    checks.slugLengthOk,
    checks.hasH2,
    checks.imagesAltOk,
    checks.wordCountOk,
  ];

  const score = Math.round((items.filter(Boolean).length / items.length) * 100);
  seoScoreElement.textContent = `SEO Score: ${score}/100`;
  seoWordCountElement.textContent = `Word Count: ${checks.wordCount}`;

  setChecklistItemState(seoTitleItem, checks.titleLengthOk);
  setChecklistItemState(seoDescriptionItem, checks.descriptionLengthOk);
  setChecklistItemState(seoSlugItem, checks.slugLengthOk);
  setChecklistItemState(seoH2Item, checks.hasH2);
  setChecklistItemState(seoImageAltItem, checks.imagesAltOk);
  setChecklistItemState(seoWordItem, checks.wordCountOk);
}

let seoUpdateTimer = null;

function scheduleSeoChecklistUpdate() {
  if (seoUpdateTimer) {
    clearTimeout(seoUpdateTimer);
  }

  seoUpdateTimer = setTimeout(() => {
    updateSeoChecklist();
  }, 80);
}

function syncHeadingSelect() {
  if (editor.isActive("heading", { level: 1 })) {
    headingSelect.value = "1";
    return;
  }

  if (editor.isActive("heading", { level: 2 })) {
    headingSelect.value = "2";
    return;
  }

  if (editor.isActive("heading", { level: 3 })) {
    headingSelect.value = "3";
    return;
  }

  headingSelect.value = "paragraph";
}

editor.on("selectionUpdate", syncHeadingSelect);
editor.on("update", syncHeadingSelect);
editor.on("update", scheduleSeoChecklistUpdate);
editor.on("transaction", scheduleSeoChecklistUpdate);
syncHeadingSelect();
setTimeout(processInstagramEmbeds, 150);
setTimeout(processInstagramEmbeds, 900);

if (postIdInput) {
  postIdInput.value = initialPost.id || "";
}

if (postTitleInput) {
  postTitleInput.value = initialPost.title || "";
}

if (postSlugInput) {
  postSlugInput.value = initialPost.slug || "";
}

if (postDescriptionInput) {
  postDescriptionInput.value = initialPost.description || "";
}

if (postCategoryInput) {
  postCategoryInput.value = initialPost.category || "job";
}

if (postTagsInput) {
  postTagsInput.value = Array.isArray(initialPost.tags)
    ? initialPost.tags.join(", ")
    : "";
}

if (postPublishedAtInput) {
  let dateValue = "";
  if (initialPost.published_at) {
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
    const date = new Date(initialPost.published_at);
    dateValue = date.toISOString().slice(0, 16);
  } else {
    // Set to current date/time if no published_at
    const now = new Date();
    dateValue = now.toISOString().slice(0, 16);
  }
  postPublishedAtInput.value = dateValue;
}

updateSeoChecklist();

postCategoryInput.addEventListener("change", scheduleSeoChecklistUpdate);
postTagsInput.addEventListener("input", scheduleSeoChecklistUpdate);
editorElement.addEventListener("keyup", scheduleSeoChecklistUpdate);

postTitleInput.addEventListener("input", () => {
  if (!slugManuallyChanged) {
    postSlugInput.value = toSlug(postTitleInput.value);
  }

  scheduleSeoChecklistUpdate();
});

postSlugInput.addEventListener("input", () => {
  slugManuallyChanged = true;
  postSlugInput.value = toSlug(postSlugInput.value);
  scheduleSeoChecklistUpdate();
});

postDescriptionInput.addEventListener("input", scheduleSeoChecklistUpdate);

headingSelect.addEventListener("change", () => {
  const value = headingSelect.value;

  if (value === "paragraph") {
    editor.chain().focus().setParagraph().run();
    return;
  }

  editor
    .chain()
    .focus()
    .toggleHeading({ level: Number(value) })
    .run();
});

boldBtn.addEventListener("click", () => {
  editor.chain().focus().toggleBold().run();
});

italicBtn.addEventListener("click", () => {
  editor.chain().focus().toggleItalic().run();
});

underlineBtn.addEventListener("click", () => {
  editor.chain().focus().toggleUnderline().run();
});

strikeBtn.addEventListener("click", () => {
  editor.chain().focus().toggleStrike().run();
});

highlightBtn.addEventListener("click", () => {
  editor.chain().focus().toggleHighlight().run();
});

applyColorBtn.addEventListener("click", () => {
  editor.chain().focus().setColor(colorInput.value).run();
});

clearColorBtn.addEventListener("click", () => {
  editor.chain().focus().unsetColor().run();
});

orderedBtn.addEventListener("click", () => {
  editor.chain().focus().toggleOrderedList().run();
});

bulletBtn.addEventListener("click", () => {
  editor.chain().focus().toggleBulletList().run();
});

taskListBtn.addEventListener("click", () => {
  editor.chain().focus().toggleTaskList().run();
});

quoteBtn.addEventListener("click", () => {
  editor.chain().focus().toggleBlockquote().run();
});

codeBlockBtn.addEventListener("click", () => {
  editor.chain().focus().toggleCodeBlock().run();
});

hrBtn.addEventListener("click", () => {
  editor.chain().focus().setHorizontalRule().run();
});

leftAlignBtn.addEventListener("click", () => {
  editor.chain().focus().setTextAlign("left").run();
});

centerAlignBtn.addEventListener("click", () => {
  editor.chain().focus().setTextAlign("center").run();
});

rightAlignBtn.addEventListener("click", () => {
  editor.chain().focus().setTextAlign("right").run();
});

linkBtn.addEventListener("click", () => {
  const previousUrl = editor.getAttributes("link").href || "";
  const url = window.prompt("Enter URL", previousUrl);

  if (url === null) {
    return;
  }

  if (!url.trim()) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  if (!canUseUrl(url.trim())) {
    setStatus("Please enter a valid http/https link.", true);
    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: url.trim() })
    .run();
  setStatus("Link applied.");
});

unlinkBtn.addEventListener("click", () => {
  editor.chain().focus().unsetLink().run();
});

imageBtn.addEventListener("click", () => {
  const src = window.prompt("Enter image URL (http/https)");

  if (!src) {
    return;
  }

  if (!canUseUrl(src.trim())) {
    setStatus("Please enter a valid image URL.", true);
    return;
  }

  editor.chain().focus().setImage({ src: src.trim() }).run();
});

videoBtn.addEventListener("click", () => {
  const url = window.prompt("Enter YouTube URL");

  if (!url) {
    return;
  }

  if (!canUseUrl(url.trim())) {
    setStatus("Please enter a valid YouTube URL.", true);
    return;
  }

  editor
    .chain()
    .focus()
    .setYoutubeVideo({
      src: url.trim(),
      width: 640,
      height: 360,
    })
    .run();
});

instagramBtn.addEventListener("click", () => {
  const url = window.prompt("Enter Instagram post/reel URL");

  if (!url) {
    return;
  }

  const embedMeta = getInstagramEmbedMeta(url);

  if (!embedMeta) {
    setStatus("Please enter a valid Instagram post or reel URL.", true);
    return;
  }

  editor.chain().focus().setInstagramEmbed({ permalink: embedMeta.permalink }).insertContent("<p></p>").run();
  setTimeout(processInstagramEmbeds, 80);
  setTimeout(processInstagramEmbeds, 500);

  setStatus("Instagram embed added.");
});

tableAddBtn.addEventListener("click", () => {
  editor
    .chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
});

tableRowAddBtn.addEventListener("click", () => {
  editor.chain().focus().addRowAfter().run();
});

tableColAddBtn.addEventListener("click", () => {
  editor.chain().focus().addColumnAfter().run();
});

tableDeleteRowBtn.addEventListener("click", () => {
  editor.chain().focus().deleteRow().run();
});

tableDeleteColBtn.addEventListener("click", () => {
  editor.chain().focus().deleteColumn().run();
});

tableDeleteBtn.addEventListener("click", () => {
  editor.chain().focus().deleteTable().run();
});

undoBtn.addEventListener("click", () => {
  editor.chain().focus().undo().run();
});

redoBtn.addEventListener("click", () => {
  editor.chain().focus().redo().run();
});

async function savePost({ enforceSeoChecks }) {
  const postId = (postIdInput.value || "").trim();
  const title = postTitleInput.value.trim();
  const slug = toSlug(postSlugInput.value || title);
  const description = postDescriptionInput.value.trim();
  const category = postCategoryInput.value;
  const tags = postTagsInput.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const publishedAtValue = postPublishedAtInput.value.trim();
  const rawContent = editor.getHTML();
  const content = optimizeHtmlForSeo(rawContent, title);

  if (!title || !slug || !description || !category) {
    setStatus("Please fill title, slug, description and category.", true);
    return;
  }

  if (enforceSeoChecks) {
    const checks = getSeoChecks();
    if (!checks.titleLengthOk || !checks.descriptionLengthOk || !checks.slugLengthOk) {
      setStatus(
        "SEO basics incomplete: fix title/description/slug lengths or use Save Post Anyway.",
        true
      );
      return;
    }
  }

  saveBtn.disabled = true;
  if (saveAnyBtn) {
    saveAnyBtn.disabled = true;
  }
  setStatus("Saving...");

  try {
    const response = await fetch("/admin/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        title,
        slug,
        description,
        category,
        tags,
        content,
        publishedAt: publishedAtValue,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to save file.");
    }

    if (postIdInput) {
      postIdInput.value = data.postId || postId;
    }

    if (postSlugInput) {
      postSlugInput.value = data.slug || slug;
    }

    statusElement.innerHTML = `Post saved. <a href="${data.previewUrl}" target="_blank" rel="noopener noreferrer">View post</a> | <a href="${data.editUrl}" target="_blank" rel="noopener noreferrer">Edit link</a>`;
    statusElement.style.color = "#14345f";
  } catch (error) {
    setStatus(error.message || "Unable to save file.", true);
  } finally {
    saveBtn.disabled = false;
    if (saveAnyBtn) {
      saveAnyBtn.disabled = false;
    }
  }
}

saveBtn.addEventListener("click", async () => {
  await savePost({ enforceSeoChecks: true });
});

if (saveAnyBtn) {
  saveAnyBtn.addEventListener("click", async () => {
    await savePost({ enforceSeoChecks: false });
  });
}
