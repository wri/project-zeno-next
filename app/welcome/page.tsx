import { notFound } from "@/app/lib/router";
import { isFrontDoorEnabled } from "@/app/config/front-door";
import { WelcomePage } from "@/src/features/front-door";

export const metadata = {
  title: "Welcome | Global Nature Watch",
};

// The front door's consent screen. Only exists with NEXT_PUBLIC_FRONT_DOOR on;
// otherwise /onboarding gates /app as before and this route 404s.
export default function Welcome() {
  if (!isFrontDoorEnabled()) {
    notFound();
  }

  return <WelcomePage />;
}
