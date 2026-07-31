import ClarifyForm from "./ClarifyForm"
import PlanNotebook from "./PlanNotebook"
import MapView from "./MapView"
import ActivityCards from "./ActivityCards"
import POICard from "./POICard"
import BudgetTracker from "./BudgetTracker"
import FlightList from "./FlightList"
import CheckList from "./CheckList"
import NoteCard from "./NoteCard"
import LinkCard from "./LinkCard"
import ImageCard from "./ImageCard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentEntry = React.ComponentType<{ data: any; onInteract: (...args: any[]) => void }>

const registry: Record<string, ComponentEntry> = {
  clarify_form: ClarifyForm,
  itinerary: PlanNotebook,
  plan_notebook: PlanNotebook,
  map_view: MapView,
  activity_cards: ActivityCards,
  poi_card: POICard,
  budget_tracker: BudgetTracker,
  flight_list: FlightList,
  checklist: CheckList,
  note_card: NoteCard,
  link_card: LinkCard,
  image_card: ImageCard,
}

export default registry

// 组件分类：决定"一键整理"时的行为
export type ComponentCategory = "plan" | "auxiliary" | "process"

export const COMPONENT_CATEGORIES: Record<string, ComponentCategory> = {
  plan_notebook: "plan",
  itinerary: "plan",
  budget_tracker: "auxiliary",
  checklist: "auxiliary",
  map_view: "auxiliary",
  clarify_form: "process",
  poi_card: "process",
  activity_cards: "process",
  flight_list: "process",
  note_card: "auxiliary",
  link_card: "auxiliary",
  image_card: "auxiliary",
}
