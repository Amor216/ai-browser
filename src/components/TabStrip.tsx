import type { TabsState } from "../../shared/ipc.js";
import { Plus } from "../icons.js";
import { Tab } from "./Tab.js";

type Props = {
  state: TabsState;
};

export function TabStrip({ state }: Props) {
  return (
    <div className="tabstrip">
      <div className="tab-list">
        {state.tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            active={tab.id === state.activeId}
            onActivate={() => window.api.tabActivate(tab.id)}
            onClose={() => window.api.tabClose(tab.id)}
            onDropOn={(fromId) => window.api.tabReorder(fromId, tab.id)}
          />
        ))}
      </div>
      <button
        className="new-tab"
        onClick={() => window.api.tabNew({ kind: "newtab" })}
        aria-label="New tab"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
