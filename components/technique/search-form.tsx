import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  action: string;
  defaultValue?: string;
};

export function SearchForm({ action, defaultValue = "" }: Props) {
  return (
    <form action={action} method="get" role="search" className="flex gap-2">
      <Label htmlFor="technique-search" className="sr-only">
        Buscar técnica
      </Label>
      <Input
        id="technique-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Buscar por nombre o tema"
        maxLength={80}
        className="h-11"
      />
      <Button type="submit" variant="secondary" className="shrink-0">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Buscar</span>
      </Button>
    </form>
  );
}
