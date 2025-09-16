## Legend Symbology types

### Symbol List
Can be:
- a solid color
- a line
- a dashed line
- an icon
  
```tsx
<LegendSymbolList
  items={[
    {
      color: "#4CAF50",
      value: "Estimated Tree Cover Loss 4PSG 932 (hsa)",
    },
    {
      color: "#FFC107",
      value: "Estimated burn area",
    },
    {
      type: "line",
      color: "#FF5722",
      value: "Estimated deforestation",
    },
    {
      type: "dashed",
      color: "#22ffde",
      value: "Watershed",
    },
    {
      type: "icon",
      color: "#00d77d",
      value: "Recycling",
      icon: <LeafIcon size={16} />,
    },
  ]}
 />
 ```

### Categorical
Renders a categorical legend with color blocks. Labels are truncated and on hover a tooltip is shown.

```tsx
<LegendCategorical
  items={[
    { color: "#4CAF50", value: "Forest" },
    { color: "#FFC107", value: "Grassland" },
    { color: "#2196F3", value: "Wetland" },
    { color: "#9E9E9E", value: "Barren" },
    { color: "#F44336", value: "Urban" },
    { color: "#0a986b", value: "Tundra" },
    { color: "#e4e0e0", value: "Snowy" },
  ]}
 />
```

### Sequential
Renders a sequential legend with a gradient color scale.
When providing the colors as an array they're evenly distributed.

```tsx
<LegendSequential
  min={10}
  max={100}
  color={["#4CAF50", "#FFC107", "#2196F3"]}
/>
```

When providing the colors as an array of objects, the colors' position is mapped to their corresponding values.

```tsx
<LegendSequential
  min={10}
  max={100}
  color={[
    { color: "#4CAF50", value: 10 },
    { color: "#FFC107", value: 80 },
    { color: "#2196F3", value: 95 },
  ]}
/>
```

### Divergent
Renders a divergent legend with a gradient color scale.
The colors are mirrored around the center, so only the first part of the divergent scale is needed.

```tsx
<LegendDivergent
  min={-1}
  max={1}
  color={["#2196F3", "#b41919", "#ff00dd"]}
/>
```
 