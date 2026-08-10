import { Template } from "../api";

export class TemplateList {
  private container: HTMLElement;
  private filterQuery: string = "";
  private onSelectTemplate: (template: Template) => void;
  private onApplyTemplate: (template: Template) => void;
  private onDeleteTemplate: (id: string) => void;
  private onCreateNew: () => void;

  constructor(
    container: HTMLElement,
    onSelectTemplate: (template: Template) => void,
    onApplyTemplate: (template: Template) => void,
    onDeleteTemplate: (id: string) => void,
    onCreateNew: () => void
  ) {
    this.container = container;
    this.onSelectTemplate = onSelectTemplate;
    this.onApplyTemplate = onApplyTemplate;
    this.onDeleteTemplate = onDeleteTemplate;
    this.onCreateNew = onCreateNew;
  }

  public render(templates: Template[], activeId?: string, selectedId?: string) {
    const query = this.filterQuery.toLowerCase();
    const filtered = templates.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.activity.name.toLowerCase().includes(query) ||
      (t.activity.details && t.activity.details.toLowerCase().includes(query))
    );

    this.container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Presets Library</span>
          <button id="btn-new-template" class="btn btn-primary btn-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New
          </button>
        </div>

        <div class="search-box-container">
          <input type="text" id="inp-search-presets" class="search-input" placeholder="🔍 Search presets..." value="${escapeHtml(this.filterQuery)}">
        </div>

        <div class="template-scroll-list">
          ${filtered.length === 0 ? `
            <div style="text-align: center; padding: 24px 12px; color: var(--discord-text-muted); font-size: 13px;">
              ${templates.length === 0 ? 'No status presets saved. Click "New" to create one.' : 'No presets match your search.'}
            </div>
          ` : filtered.map(t => {
            const isActive = activeId === t.id;
            const isSelected = selectedId === t.id;
            const details = t.activity.details || t.activity.state || "No description";
            const icon = getActivityIcon(t.activity.type);
            return `
              <div class="template-card ${isActive ? 'active' : ''}" data-id="${t.id}" style="${isSelected && !isActive ? 'border-color: var(--discord-text-muted);' : ''}">
                <div class="template-name">
                  <span>${icon} ${escapeHtml(t.name)}</span>
                  ${isActive ? `<span class="active-pill">Active</span>` : ''}
                </div>
                <div class="template-subtitle">${escapeHtml(t.activity.name)} — ${escapeHtml(details)}</div>
                
                <div class="template-actions-row">
                  <button class="btn btn-success btn-sm btn-apply" data-id="${t.id}">Apply Status</button>
                  <button class="btn btn-secondary btn-sm btn-edit" data-id="${t.id}">Edit</button>
                  ${templates.length > 1 ? `<button class="btn btn-danger btn-sm btn-delete" data-id="${t.id}">Delete</button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const searchInp = this.container.querySelector("#inp-search-presets") as HTMLInputElement;
    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        this.filterQuery = (e.target as HTMLInputElement).value;
        this.render(templates, activeId, selectedId);
      });
      // Maintain focus position
      searchInp.selectionStart = searchInp.selectionEnd = searchInp.value.length;
    }

    this.container.querySelector("#btn-new-template")?.addEventListener("click", () => {
      this.onCreateNew();
    });

    this.container.querySelectorAll(".template-card").forEach(card => {
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "BUTTON") return;
        const id = card.getAttribute("data-id");
        const found = templates.find(t => t.id === id);
        if (found) this.onSelectTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-apply").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute("data-id");
        const found = templates.find(t => t.id === id);
        if (found) this.onApplyTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute("data-id");
        const found = templates.find(t => t.id === id);
        if (found) this.onSelectTemplate(found);
      });
    });

    this.container.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute("data-id");
        if (id && confirm("Are you sure you want to delete this preset?")) {
          this.onDeleteTemplate(id);
        }
      });
    });
  }
}

function getActivityIcon(type: number): string {
  switch (type) {
    case 0: return "🎮";
    case 2: return "🎧";
    case 3: return "📺";
    case 5: return "🏆";
    default: return "🎮";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
