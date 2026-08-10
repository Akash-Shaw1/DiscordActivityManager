import { Template } from "../api";

export class TemplateList {
  private container: HTMLElement;
  private filterQuery = "";
  private onSelectTemplate: (t: Template) => void;
  private onApplyTemplate: (t: Template) => void;
  private onDeleteTemplate: (id: string) => void;
  private onCreateNew: () => void;

  constructor(
    container: HTMLElement,
    onSelect: (t: Template) => void,
    onApply: (t: Template) => void,
    onDelete: (id: string) => void,
    onCreate: () => void
  ) {
    this.container = container;
    this.onSelectTemplate = onSelect;
    this.onApplyTemplate = onApply;
    this.onDeleteTemplate = onDelete;
    this.onCreateNew = onCreate;
  }

  public render(templates: Template[], activeId?: string, selectedId?: string) {
    const q = this.filterQuery.toLowerCase();
    const filtered = templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.activity.name.toLowerCase().includes(q) ||
      (t.activity.details && t.activity.details.toLowerCase().includes(q))
    );

    this.container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-head">
          <span class="eyebrow">Presets library</span>
          <button id="btn-new-template" class="btn btn-primary btn-sm">+ New</button>
        </div>
        <input type="text" id="inp-search" class="search" placeholder="Search presets..." value="${esc(this.filterQuery)}">
        <div class="preset-list">
          ${filtered.length === 0 ? `<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:13px;">${templates.length === 0 ? 'No presets yet. Click "+ New".' : 'No match.'}</div>` :
            filtered.map(t => {
              const isActive = activeId === t.id;
              const isSel = selectedId === t.id;
              const detail = t.activity.details || t.activity.state || "No description";
              return `
                <div class="preset-card${isActive ? ' active' : ''}${isSel && !isActive ? ' selected' : ''}" data-id="${t.id}">
                  <div class="row">
                    <span class="name">${esc(t.name)}</span>
                    ${isActive ? '<span class="badge-active">ACTIVE</span>' : ''}
                  </div>
                  <div class="desc">${esc(t.activity.name)} — ${esc(detail)}</div>
                  <div class="actions">
                    <button class="btn btn-success btn-sm btn-block btn-apply" data-id="${t.id}">Apply Status</button>
                    <button class="btn btn-secondary btn-sm btn-edit" data-id="${t.id}">Edit</button>
                    ${templates.length > 1 ? `<button class="btn btn-danger btn-sm btn-delete" data-id="${t.id}">Delete</button>` : ''}
                  </div>
                </div>`;
            }).join('')}
        </div>
      </div>
    `;

    const searchInp = this.container.querySelector("#inp-search") as HTMLInputElement;
    if (searchInp) {
      searchInp.addEventListener("input", e => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render(templates, activeId, selectedId);
      });
      searchInp.setSelectionRange(searchInp.value.length, searchInp.value.length);
    }

    this.container.querySelector("#btn-new-template")?.addEventListener("click", () => this.onCreateNew());

    this.container.querySelectorAll(".preset-card").forEach(card => {
      card.addEventListener("click", e => {
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        const id = card.getAttribute("data-id");
        const found = templates.find(t => t.id === id);
        if (found) this.onSelectTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-apply").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const found = templates.find(t => t.id === (btn as HTMLElement).getAttribute("data-id"));
        if (found) this.onApplyTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const found = templates.find(t => t.id === (btn as HTMLElement).getAttribute("data-id"));
        if (found) this.onSelectTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute("data-id");
        if (id && confirm("Delete this preset?")) this.onDeleteTemplate(id);
      });
    });
  }
}

function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
