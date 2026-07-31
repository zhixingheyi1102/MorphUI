import ClarifyForm from "./ClarifyForm"
import Itinerary from "./Itinerary"
import MapView from "./MapView"
import ActivityCards from "./ActivityCards"
import POICard from "./POICard"
import BudgetTracker from "./BudgetTracker"
import FlightList from "./FlightList"
import CheckList from "./CheckList"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentEntry = React.ComponentType<{ data: any; onInteract: (...args: any[]) => void }>

const registry: Record<string, ComponentEntry> = {
  clarify_form: ClarifyForm,
  itinerary: Itinerary,
  map_view: MapView,
  activity_cards: ActivityCards,
  poi_card: POICard,
  budget_tracker: BudgetTracker,
  flight_list: FlightList,
  checklist: CheckList,
}

export default registry
