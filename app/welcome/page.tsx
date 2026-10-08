import { WelcomePage } from "@/src/features/front-door";

export const metadata = {
  title: "Welcome | Global Nature Watch",
};

// The front door's consent screen, between the Resource Watch sign-in and
// /app for anyone who hasn't accepted the terms.
export default function Welcome() {
  return <WelcomePage />;
}
