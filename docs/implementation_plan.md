# Sourcing Engine Implementation Plan (V2 Updates)

## Goal Description
Enhance the Promising Engine with:
1.  **Dynamic Safety Stock**: Adjusts based on store traffic.
2.  **Pluggable Interfaces**: Interfaces for Inventory and Rate Shopping.
3.  **Configurable Optimization**: Support for "Save the Sale" vs "Profit" strategies.
4.  **Variable SLA**: Per-item prep times.
5.  **Performance Optimization**: Geo-filtering to reduce search space (V3).

## User Review Required
> [!TIP]
> **Geo-Filtering**: To handle thousands of locations, we invoke a `CandidateSelector` first. It uses a lightweight algorithm (Haversine distance or Zone Map) to reduce the list from 5000 -> 50 potential fulfillment nodes before running expensive Inventory/Capacity checks.

## Proposed Changes

### Core Interfaces
#### [MODIFY] [types.ts](file:///Users/rtarway/.gemini/antigravity/playground/holographic-photon/src/types.ts)
- Add `maxSearchRadiusMiles` to `SourcingConfig`.

### Abstractions
#### [NEW] [candidate-selector.ts](file:///Users/rtarway/.gemini/antigravity/playground/holographic-photon/src/sourcing/candidate-selector.ts)
- `selectCandidates(order, allLocations): Location[]`
- Implementation: Sort by distance, Take top N (e.g., 50) OR Filter by Radius (e.g., 500 miles).

### Service Updates
#### [MODIFY] [sourcing-engine.ts](file:///Users/rtarway/.gemini/antigravity/playground/holographic-photon/src/sourcing/engine.ts)
- Inject `CandidateSelector`.
- Call `candidateSelector.selectCandidates()` at start of `calculatePromise`.

### Product Backlog
#### [NEW] [backlog.md](file:///Users/rtarway/.gemini/antigravity/brain/f9ab208d-0b5b-4f56-a355-4a9e6177c05b/backlog.md)
- Story: "Implement Spatial Indexing (S2/Geohash) for Candidate Selection" (Future optimization beyond simple loop).
