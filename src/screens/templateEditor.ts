import { Template } from "../api";

const BOLT_SVG = `<svg width="20" height="20" viewBox="0 0 256 256"><path d="M148 36 L64 148 L112 148 L98 220 L192 106 L142 106 Z" fill="#4c8cff"/></svg>`;

export class TemplateEditor {
  private container: HTMLElement;
  private currentTemplate: Template;
  private activeTab: "general" | "art" | "buttons" = "general";
  private onSave: (t: Template) => void;
  private onApply: (t: Template) => void;

  constructor(container: HTMLElement, template: Template, onSave: (t: Template) => void, onApply: (t: Template) => void) {
    this.container = container;
    this.currentTemplate = structuredClone(template);
    this.onSave = onSave;
    this.onApply = onApply;
  }

  public setTemplate(template: Template) {
    this.currentTemplate = structuredClone(template);
    this.render();
  }

  public render() {
    const act = this.currentTemplate.activity;
    const assets = act.assets || {};
    const btns = act.buttons || [];
    const b1 = btns[0] || { label: "", url: "" };
    const b2 = btns[1] || { label: "", url: "" };

    this.container.innerHTML = `
      <div class="main-col">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab${this.activeTab === 'general' ? ' active' : ''}" data-tab="general">📄 General Details</button>
          <button class="tab${this.activeTab === 'art' ? ' active' : ''}" data-tab="art">🖼 Art & Media</button>
          <button class="tab${this.activeTab === 'buttons' ? ' active' : ''}" data-tab="buttons">🔗 Action Buttons</button>
        </div>

        <!-- Form card -->
        <div class="card">
          ${this.activeTab === 'general' ? `
            <div class="card-head">✏️ General status configuration</div>
            <div class="field-row"><div class="field"><label>Preset name</label><input type="text" id="inp-preset-name" value="${ea(this.currentTemplate.name)}"></div></div>
            <div class="field-row">
              <div class="field"><label>Application / game title</label><input type="text" id="inp-act-name" value="${ea(act.name)}"></div>
              <div class="field"><label>Activity type</label>
                <select id="inp-act-type">
                  <option value="0"${act.type===0?' selected':''}>Playing a game</option>
                  <option value="2"${act.type===2?' selected':''}>Listening to music</option>
                  <option value="3"${act.type===3?' selected':''}>Watching stream</option>
                  <option value="5"${act.type===5?' selected':''}>Competing in tournament</option>
                </select>
              </div>
            </div>
            <div class="field-row"><div class="field"><label>Details (line 1)</label><input type="text" id="inp-act-details" value="${ea(act.details||"")}"></div></div>
            <div class="field-row"><div class="field"><label>State (line 2)</label><input type="text" id="inp-act-state" value="${ea(act.state||"")}"></div></div>
            <div class="checkbox-row">
              <input type="checkbox" id="chk-timer"${act.timestamps?.start?' checked':''}>
              <label for="chk-timer" style="cursor:pointer;text-transform:none;font-weight:500;font-size:13px;">Show live counting elapsed timer</label>
            </div>
          ` : ''}

          ${this.activeTab === 'art' ? `
            <div class="card-head">🖼 Art assets & tooltips</div>
            <div class="field-row">
              <div class="field"><label>Large image key</label><input type="text" id="inp-large-img" value="${ea(assets.large_image||"")}"></div>
              <div class="field"><label>Large image tooltip</label><input type="text" id="inp-large-txt" value="${ea(assets.large_text||"")}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Small image key</label><input type="text" id="inp-small-img" value="${ea(assets.small_image||"")}"></div>
              <div class="field"><label>Small image tooltip</label><input type="text" id="inp-small-txt" value="${ea(assets.small_text||"")}"></div>
            </div>
          ` : ''}

          ${this.activeTab === 'buttons' ? `
            <div class="card-head">🔗 Custom action buttons (max 2)</div>
            <div class="field-row">
              <div class="field"><label>Button 1 label</label><input type="text" id="inp-btn1-label" value="${ea(b1.label)}"></div>
              <div class="field"><label>Button 1 URL</label><input type="text" id="inp-btn1-url" value="${ea(b1.url)}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Button 2 label</label><input type="text" id="inp-btn2-label" value="${ea(b2.label)}"></div>
              <div class="field"><label>Button 2 URL</label><input type="text" id="inp-btn2-url" value="${ea(b2.url)}"></div>
            </div>
          ` : ''}

          <div class="card-footer">
            <button id="btn-save" class="btn btn-secondary">💾 Save Preset</button>
            <button id="btn-apply" class="btn btn-success">✓ Apply Status Now</button>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <div class="card rpc-card">
          <div class="rpc-icon">${BOLT_SVG}</div>
          <div>
            <div class="rpc-name">Native Discord RPC</div>
            <div class="rpc-desc">Real-time presence engine powered by a Rust named-pipe transport.</div>
          </div>
        </div>

        <span class="eyebrow">Live profile preview</span>
        <div class="preview-card">
          <div class="profile-row">
            <div class="avatar">U<span class="status-dot"></span></div>
            <div>
              <div class="profile-name">You</div>
              <div class="handle">discord_user</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="activity-eyebrow" id="prev-type">${typeLabel(act.type)}</div>
          <div class="activity">
            <div class="activity-art">
              ${BOLT_SVG}
              <span class="badge"></span>
            </div>
            <div>
              <div class="activity-name" id="prev-title">${eh(act.name||"App Name")}</div>
              <div class="activity-line" id="prev-details">${eh(act.details||"")}</div>
              <div class="activity-line muted" id="prev-state">${eh(act.state||"")}</div>
              <div class="activity-timer" id="prev-timer" style="display:${act.timestamps?.start?'block':'none'}">00:00 elapsed</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updatePreview();
  }

  public collectFormData(): Template {
    const v = (id: string) => (this.container.querySelector(`#${id}`) as HTMLInputElement|HTMLSelectElement)?.value?.trim() || "";
    const name = v("inp-preset-name") || this.currentTemplate.name;
    const actName = v("inp-act-name") || this.currentTemplate.activity.name;
    const actType = v("inp-act-type") !== "" ? parseInt(v("inp-act-type"),10) : this.currentTemplate.activity.type;
    const details = v("inp-act-details") || this.currentTemplate.activity.details;
    const state = v("inp-act-state") || this.currentTemplate.activity.state;

    const li = v("inp-large-img") || this.currentTemplate.activity.assets?.large_image;
    const lt = v("inp-large-txt") || this.currentTemplate.activity.assets?.large_text;
    const si = v("inp-small-img") || this.currentTemplate.activity.assets?.small_image;
    const st = v("inp-small-txt") || this.currentTemplate.activity.assets?.small_text;
    const assets = (li||lt||si||st) ? {large_image:li,large_text:lt,small_image:si,small_text:st} : undefined;

    const l1 = v("inp-btn1-label") || this.currentTemplate.activity.buttons?.[0]?.label;
    const u1 = v("inp-btn1-url") || this.currentTemplate.activity.buttons?.[0]?.url;
    const l2 = v("inp-btn2-label") || this.currentTemplate.activity.buttons?.[1]?.label;
    const u2 = v("inp-btn2-url") || this.currentTemplate.activity.buttons?.[1]?.url;
    const btns = [];
    if (l1&&u1) btns.push({label:l1,url:u1});
    if (l2&&u2) btns.push({label:l2,url:u2});

    const chk = this.container.querySelector("#chk-timer") as HTMLInputElement;
    const showTimer = chk ? chk.checked : !!this.currentTemplate.activity.timestamps?.start;
    const timestamps = showTimer ? {start:Math.floor(Date.now()/1000)} : undefined;

    this.currentTemplate = {id:this.currentTemplate.id,name,activity:{name:actName,details,state,type:actType,timestamps,assets,buttons:btns.length>0?btns:undefined}};
    return this.currentTemplate;
  }

  private attachEvents() {
    this.container.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this.collectFormData();
        const tab = (btn as HTMLElement).getAttribute("data-tab") as "general"|"art"|"buttons";
        if (tab) { this.activeTab = tab; this.render(); }
      });
    });

    const bind = (id: string, cb: (v:string)=>void) => {
      const el = this.container.querySelector(`#${id}`) as HTMLInputElement|HTMLSelectElement;
      if (el) el.addEventListener("input", e => { cb((e.target as HTMLInputElement).value); this.updatePreview(); });
    };

    bind("inp-preset-name", v => { this.currentTemplate.name = v; });
    bind("inp-act-name", v => { this.currentTemplate.activity.name = v; });
    bind("inp-act-type", v => { this.currentTemplate.activity.type = parseInt(v,10); });
    bind("inp-act-details", v => { this.currentTemplate.activity.details = v||undefined; });
    bind("inp-act-state", v => { this.currentTemplate.activity.state = v||undefined; });
    bind("inp-large-img", v => { if(!this.currentTemplate.activity.assets)this.currentTemplate.activity.assets={}; this.currentTemplate.activity.assets.large_image=v||undefined; });
    bind("inp-large-txt", v => { if(!this.currentTemplate.activity.assets)this.currentTemplate.activity.assets={}; this.currentTemplate.activity.assets.large_text=v||undefined; });
    bind("inp-small-img", v => { if(!this.currentTemplate.activity.assets)this.currentTemplate.activity.assets={}; this.currentTemplate.activity.assets.small_image=v||undefined; });
    bind("inp-small-txt", v => { if(!this.currentTemplate.activity.assets)this.currentTemplate.activity.assets={}; this.currentTemplate.activity.assets.small_text=v||undefined; });

    const updateBtns = () => {
      const g = (id:string) => (this.container.querySelector(`#${id}`) as HTMLInputElement)?.value||"";
      const btns = [];
      if(g("inp-btn1-label")&&g("inp-btn1-url")) btns.push({label:g("inp-btn1-label"),url:g("inp-btn1-url")});
      if(g("inp-btn2-label")&&g("inp-btn2-url")) btns.push({label:g("inp-btn2-label"),url:g("inp-btn2-url")});
      this.currentTemplate.activity.buttons = btns.length>0?btns:undefined;
      this.updatePreview();
    };
    ["inp-btn1-label","inp-btn1-url","inp-btn2-label","inp-btn2-url"].forEach(id => this.container.querySelector(`#${id}`)?.addEventListener("input",updateBtns));

    const chk = this.container.querySelector("#chk-timer") as HTMLInputElement;
    if(chk) chk.addEventListener("change",()=>{
      this.currentTemplate.activity.timestamps = chk.checked ? {start:Math.floor(Date.now()/1000)} : undefined;
      this.updatePreview();
    });

    this.container.querySelector("#btn-save")?.addEventListener("click",()=>{
      this.onSave(this.collectFormData()); toast("✨ Preset saved!");
    });
    this.container.querySelector("#btn-apply")?.addEventListener("click",()=>{
      const t = this.collectFormData(); this.onSave(t); this.onApply(t); toast("🚀 Status applied to Discord!");
    });
  }

  private updatePreview() {
    const a = this.currentTemplate.activity;
    const el = (id:string) => this.container.querySelector(`#${id}`);
    const e = el("prev-type"); if(e) e.textContent = typeLabel(a.type);
    const t = el("prev-title"); if(t) t.textContent = a.name||"App Name";
    const d = el("prev-details"); if(d) d.textContent = a.details||"";
    const s = el("prev-state"); if(s) s.textContent = a.state||"";
    const tm = el("prev-timer") as HTMLElement;
    if(tm){
      if(a.timestamps?.start){
        let sec = a.timestamps.start;
        if(sec>20000000000) sec = Math.floor(sec/1000);
        const elapsed = Math.max(0,Math.floor(Date.now()/1000)-sec);
        tm.textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')} elapsed`;
        tm.style.display = "block";
      } else { tm.style.display = "none"; }
    }
  }
}

function toast(msg: string) {
  let c = document.querySelector(".toast-container");
  if(!c){c=document.createElement("div");c.className="toast-container";document.body.appendChild(c);}
  const t = document.createElement("div"); t.className="toast"; t.textContent=msg; c.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

function typeLabel(type: number): string {
  switch(type){case 0:return"Playing a game";case 2:return"Listening to";case 3:return"Watching";case 5:return"Competing in";default:return"Playing a game";}
}

function eh(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function ea(s: string): string { return s.replace(/"/g,"&quot;"); }
