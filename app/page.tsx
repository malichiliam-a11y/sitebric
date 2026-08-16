import LoginScreen from "@/app/components/login/LoginScreen";

// The front door opens on the sign-in card. The live demo is still one
// click away — "Try it live" in the nav, and the link under the card —
// but searching for sitebric.com should land on the product's front door,
// not mid-way through a demo.
export default function HomePage() {
  return <LoginScreen initialPanel="auth" />;
}
