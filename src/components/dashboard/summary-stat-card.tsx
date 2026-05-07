import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@vendure/dashboard";
import type { ReactNode } from "react";

export interface SummaryStatCardProps {
  title: string;
  icon?: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function SummaryStatCard({
  title,
  icon,
  value,
  description,
  footer,
  size = "sm",
}: SummaryStatCardProps) {
  return (
    <Card size={size}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
      </CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
