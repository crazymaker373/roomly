"use client";

import { useState } from "react";
import {
  createHouseholdAction,
  joinHouseholdAction,
} from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">WG einrichten</CardTitle>
          <CardDescription>
            Gründe eine neue Wohngemeinschaft oder tritt mit einem Einladungscode
            bei.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">WG gründen</TabsTrigger>
              <TabsTrigger value="join">Beitreten</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4 pt-4">
              <form
                action={async (fd) => {
                  try {
                    setError(null);
                    await createHouseholdAction(fd);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Ein Fehler ist aufgetreten"
                    );
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name der WG</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="z.B. Musterstraße 12"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  WG erstellen
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="join" className="space-y-4 pt-4">
              <form
                action={async (fd) => {
                  try {
                    setError(null);
                    await joinHouseholdAction(fd);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Ein Fehler ist aufgetreten"
                    );
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="invite_code">Einladungscode</Label>
                  <Input
                    id="invite_code"
                    name="invite_code"
                    placeholder="ABC12345"
                    className="uppercase"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Beitreten
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
