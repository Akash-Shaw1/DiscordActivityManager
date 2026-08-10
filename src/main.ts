import { api, AppData, Template, StatusPayload } from "./api";
import { StatusBar } from "./screens/statusBar";
import { TemplateList } from "./screens/templateList";
import { TemplateEditor } from "./screens/templateEditor";
import { SettingsModal } from "./screens/settingsModal";

class App {
  private appData: AppData | null = null;
  private currentStatus: StatusPayload = { connection_state: { type: "Disconnected" } };
  private selectedTemplate: Template | null = null;

  private statusBarComponent!: StatusBar;
  private templateListComponent!: TemplateList;
  private templateEditorComponent!: TemplateEditor;

  private modalContainer!: HTMLElement;

  public async init() {
    const root = document.getElementById("app");
    if (!root) return;

    root.innerHTML = `
      <div id="status-bar-container"></div>
      <div class="main-layout">
        <div id="template-list-container"></div>
        <div id="template-editor-container"></div>
      </div>
      <div id="modal-container"></div>
    `;

    const statusBarContainer = root.querySelector("#status-bar-container") as HTMLElement;
    const templateListContainer = root.querySelector("#template-list-container") as HTMLElement;
    const templateEditorContainer = root.querySelector("#template-editor-container") as HTMLElement;
    this.modalContainer = root.querySelector("#modal-container") as HTMLElement;

    // Create Components
    this.statusBarComponent = new StatusBar(statusBarContainer, () => this.openSettings());

    this.templateListComponent = new TemplateList(
      templateListContainer,
      (template) => this.onSelectTemplate(template),
      (template) => this.onApplyTemplate(template),
      (id) => this.onDeleteTemplate(id),
      () => this.onCreateNewTemplate()
    );

    // Initial dummy template for editor initialization
    const fallbackTemplate: Template = {
      id: "new-preset",
      name: "New Custom Status",
      activity: {
        name: "Visual Studio Code",
        details: "Coding Discord Status Manager",
        state: "Tauri 2 & Rust IPC",
        type: 0,
      },
    };

    this.templateEditorComponent = new TemplateEditor(
      templateEditorContainer,
      fallbackTemplate,
      (template) => this.onSaveTemplate(template),
      (template) => this.onApplyTemplate(template)
    );

    // Load initial App Data
    try {
      this.appData = await api.getAppData();
      if (this.appData.templates.length > 0) {
        this.selectedTemplate = this.appData.templates[0];
        this.templateEditorComponent.setTemplate(this.selectedTemplate);
      }
      this.render();
    } catch (e) {
      console.error("Failed loading app data:", e);
    }

    // Subscribe to real-time Discord connection events
    try {
      await api.listenStateChange((payload) => {
        console.log("[Main] Received discord-state-changed event:", payload);
        this.currentStatus = payload;
        this.render();
      });
      // Fetch initial connection status
      const initialStatus = await api.getConnectionState();
      console.log("[Main] Initial connection state:", initialStatus);
      this.currentStatus = initialStatus;
      this.render();
    } catch (e) {
      console.warn("Real-time listener setup error:", e);
    }
  }

  private render() {
    this.statusBarComponent.render(this.currentStatus);

    if (this.appData) {
      this.templateListComponent.render(
        this.appData.templates,
        this.currentStatus.active_template_id,
        this.selectedTemplate?.id
      );
    }
  }

  private onSelectTemplate(template: Template) {
    this.selectedTemplate = template;
    this.templateEditorComponent.setTemplate(template);
    this.render();
  }

  private async onApplyTemplate(template: Template) {
    try {
      await api.setActivity(template.activity, template.id);
    } catch (e) {
      console.error("Failed setting activity:", e);
    }
  }

  private async onSaveTemplate(template: Template) {
    try {
      this.appData = await api.saveTemplate(template);
      this.selectedTemplate = template;
      this.render();
    } catch (e) {
      console.error("Failed saving template:", e);
    }
  }

  private async onDeleteTemplate(id: string) {
    try {
      this.appData = await api.deleteTemplate(id);
      if (this.appData.templates.length > 0) {
        this.selectedTemplate = this.appData.templates[0];
        this.templateEditorComponent.setTemplate(this.selectedTemplate);
      }
      this.render();
    } catch (e) {
      console.error("Failed deleting template:", e);
    }
  }

  private async onCreateNewTemplate() {
    const newId = `template-${Date.now()}`;
    const newTemplate: Template = {
      id: newId,
      name: "New Preset",
      activity: {
        name: "Visual Studio Code",
        details: "Custom details line",
        state: "Custom state line",
        type: 0,
      },
    };
    try {
      this.appData = await api.saveTemplate(newTemplate);
      this.selectedTemplate = newTemplate;
      this.templateEditorComponent.setTemplate(newTemplate);
      this.render();
    } catch (e) {
      console.error("Failed creating new template:", e);
    }
  }

  private openSettings() {
    if (!this.appData) return;
    const settingsModal = new SettingsModal(
      this.modalContainer,
      this.appData.settings,
      async (newSettings) => {
        try {
          this.appData = await api.saveSettings(newSettings);
          this.render();
        } catch (e) {
          console.error("Failed saving settings:", e);
        }
      },
      () => {
        this.modalContainer.innerHTML = "";
      }
    );
    settingsModal.render();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
