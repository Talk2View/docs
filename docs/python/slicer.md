---
title: "3D Slicer integration"
sidebar_position: 9
description: "Integrate the SDK into a 3D Slicer extension: tokens in QSettings, Slicer tools, streaming on a Qt app, and a full example."
---

# 3D Slicer integration

Here's how to integrate the SDK into a 3D Slicer extension.

## Token Storage with QSettings

Persist login across Slicer restarts:

```python
import qt

class SlicerSettingsStorage:
    """Store Talk2View tokens in Slicer's QSettings."""

    PREFIX = "Talk2View/"

    def get(self, key):
        settings = qt.QSettings()
        value = settings.value(self.PREFIX + key)
        return value if value else None

    def set(self, key, value):
        settings = qt.QSettings()
        settings.setValue(self.PREFIX + key, value)

    def delete(self, key):
        settings = qt.QSettings()
        settings.remove(self.PREFIX + key)
```

## Defining Slicer Tools

Tools run locally in Slicer's Python — they have full access to the MRML scene, VTK, and all Slicer modules:

```python
import slicer
from talk2view import tool

@tool
def get_scene_summary() -> str:
    """Get a summary of all nodes in the current 3D Slicer scene."""
    nodes = []
    for i in range(slicer.mrmlScene.GetNumberOfNodes()):
        node = slicer.mrmlScene.GetNthNode(i)
        nodes.append(f"{node.GetClassName()}: {node.GetName()}")
    return "\n".join(nodes)

@tool
def load_volume(file_path: str) -> str:
    """Load a medical image volume into the scene.

    Args:
        file_path: Path to the volume file (NRRD, NIfTI, DICOM dir).
    """
    node = slicer.util.loadVolume(file_path)
    return f"Loaded volume: {node.GetName()}"

@tool
def set_slice_offset(view: str, offset: float) -> str:
    """Set the slice offset for a slice view.

    Args:
        view: The slice view name (Red, Green, Yellow).
        offset: The offset position in mm.
    """
    slice_node = slicer.mrmlScene.GetNodeByID(f"vtkMRMLSliceNode{view}")
    slice_node.SetSliceOffset(offset)
    slicer.util.forceRenderAllViews()
    return f"Set {view} slice offset to {offset}mm"
```

Works with bound methods too — the pattern used by SlicerTools:

```python
class SlicerTools:
    def __init__(self):
        self.tools = [
            tool(self.get_scene_summary),
            tool(self.load_volume),
            tool(self.set_slice_offset),
        ]

    def get_scene_summary(self) -> str:
        """Get a summary of all nodes in the current scene."""
        # self is bound, `self` param is excluded from the schema
        ...

    def get_tools(self):
        return self.tools
```

## Streaming in a Qt App

Slicer runs on the Qt event loop. Run the stream in a thread to avoid blocking
the UI, and pass `qt_dispatcher(qt.QTimer)` so your tool handlers still run on
Slicer's main thread, where MRML access is legal:

```python
import threading
import qt
import slicer
from talk2view import qt_dispatcher

class Talk2ViewWidget:
    def __init__(self):
        # Construct on the main thread — the dispatcher starts a QTimer.
        self.t2v = Talk2View(
            partner_key="pk_live_...",
            storage=SlicerSettingsStorage(),
            model="gpt-4.1-mini",
            dispatcher=qt_dispatcher(qt.QTimer),
        )

        # Register tools
        slicer_tools = SlicerTools()
        self.t2v.tools.register_from_functions(slicer_tools.get_tools())

    def on_cancel_clicked(self):
        self.t2v.stop()  # ends the in-flight turn, from the UI thread

    def on_send_clicked(self, message):
        """Called when the user hits Send in the chat UI."""
        self.response_text = ""
        thread = threading.Thread(
            target=self._stream_chat,
            args=(message,),
            daemon=True,
        )
        thread.start()

    def _stream_chat(self, message):
        """Runs in a background thread."""
        try:
            for event in self.t2v.chat(message):
                if event.type == "text":
                    self.response_text += event.content
                    # Update UI on the main thread
                    slicer.util.mainWindow().statusBar().showMessage(
                        self.response_text[:100]
                    )
                elif event.type == "done":
                    slicer.util.mainWindow().statusBar().showMessage("Done")
        except Exception as e:
            slicer.util.errorDisplay(f"Talk2View error: {e}")
```

:::warning[Important]

Without a dispatcher, `@tool` handlers execute on the
**calling thread** — stream from a background thread and your handlers run
there too, which MRML does not allow. `dispatcher=qt_dispatcher(qt.QTimer)`
(above) posts every handler and permission callback to Slicer's main thread
and blocks the streaming thread until it has run, so handlers can touch the
scene directly. Construct the dispatcher on the main thread.

:::

## Full Integration Example

```python
import qt
import slicer
from talk2view import Talk2View, qt_dispatcher, tool

PARTNER_KEY = "pk_live_..."

# Storage
class SlicerSettingsStorage:
    PREFIX = "Talk2View/"
    def get(self, key):
        return qt.QSettings().value(self.PREFIX + key) or None
    def set(self, key, value):
        qt.QSettings().setValue(self.PREFIX + key, value)
    def delete(self, key):
        qt.QSettings().remove(self.PREFIX + key)

# Tools
@tool
def get_scene_summary() -> str:
    """Get a summary of all nodes in the current 3D Slicer scene."""
    nodes = []
    for i in range(slicer.mrmlScene.GetNumberOfNodes()):
        node = slicer.mrmlScene.GetNthNode(i)
        nodes.append(f"{node.GetClassName()}: {node.GetName()}")
    return "\n".join(nodes) if nodes else "Scene is empty"

@tool
def load_sample(name: str) -> str:
    """Download and load a sample dataset.

    Args:
        name: Sample name (e.g., "MRHead", "CTChest", "CTA-cardio").
    """
    import SampleData
    node = SampleData.downloadSample(name)
    return f"Loaded sample: {node.GetName()}"

# Initialize (on Slicer's main thread)
t2v = Talk2View(
    partner_key=PARTNER_KEY,
    storage=SlicerSettingsStorage(),
    model="gpt-4.1-mini",
    dispatcher=qt_dispatcher(qt.QTimer),
)
t2v.auth.login("user@example.com", "password")
t2v.tools.register_from_functions([get_scene_summary, load_sample])

# Chat
for event in t2v.chat("Load the MRHead sample and tell me about it"):
    if event.type == "text":
        print(event.content, end="")
    elif event.type == "tool_call":
        print(f"\n> Calling {event.tool_name}...")
    elif event.type == "done":
        print()
```
