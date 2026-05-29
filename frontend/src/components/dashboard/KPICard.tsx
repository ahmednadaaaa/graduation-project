import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  variant?: "primary" | "success" | "warning" | "destructive";
}

const variantStyles = {
  primary: "glow-primary border-primary/20",
  success: "glow-success border-success/20",
  warning: "glow-warning border-warning/20",
  destructive: "glow-destructive border-destructive/20",
};

const iconVariantStyles = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

const AnimatedCounter = ({ value }: { value: number | string }) => {
  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "")) : value;
  const suffix = typeof value === "string" ? value.replace(/[\d.-]/g, "") : "";
  const isDecimal = typeof value === "string" ? value.includes(".") : !Number.isInteger(value);
  
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isNaN(numericValue)) {
      setDisplay(0);
      return;
    }
    
    const duration = 1200;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numericValue;
      setDisplay(current);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [numericValue]);

  const formattedDisplay = isDecimal ? display.toFixed(1) : Math.round(display);
  return <span>{formattedDisplay}{suffix}</span>;
};

const KPICard = ({ title, value, icon: Icon, trend, variant = "primary" }: KPICardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass-card rounded-xl p-5 ${variantStyles[variant]} transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            <AnimatedCounter value={value} />
          </p>
          {trend && (
            <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconVariantStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
};

export default KPICard;
