import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Not found</CardTitle>
          <CardDescription>The page you requested does not exist or you don’t have access.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/trails" className="underline">Go to Trails</Link>
        </CardContent>
      </Card>
    </div>
  );
}
