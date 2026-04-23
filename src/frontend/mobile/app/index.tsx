import { Redirect } from "expo-router";

export default function Index() {
  // TODO: Check if user is authenticated, redirect accordingly
  return <Redirect href="/login" />;
}
