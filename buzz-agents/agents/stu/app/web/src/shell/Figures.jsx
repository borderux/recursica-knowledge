// A group of summary figures. `recursica-skill-screen-scaffolding` treats them as a set of peers
// with one consistent treatment, each named by a noun phrase saying what is counted —
// `Tagged lines`, not `Total tagged`.
//
// They sit on a layer rather than in cards: they are one region, not a set of repeating peer
// objects each carrying a graphic, so they fail the card tests.

import { Layer, Stack, Text, Title } from '@recursica/mantine-adapter'

export function Figures({ items }) {
  return (
    <Layer layer={1}>
      {/* Layout goes on a plain element inside the Layer, never on the Layer itself: the Layer
          owns its own box, and a `display` set from out here would be an override. */}
      <div className="stu-figures">
        {items.map((item) => (
          <Stack key={item.label} gap={2}>
            <Title order={3} component="p">{item.value}</Title>
            <Text variant="caption">{item.label}</Text>
          </Stack>
        ))}
      </div>
    </Layer>
  )
}
