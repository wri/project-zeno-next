import type { ReactNode } from "react";

import type { Tour, TourStep } from "../model/tour";

/** Tours as the overlay renders them: step bodies are React nodes. */
export type UiTourStep = TourStep<ReactNode>;
export type UiTour = Tour<ReactNode>;
