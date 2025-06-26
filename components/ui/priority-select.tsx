import { Priority } from "@/types/mindmap";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrioritySelectProps {
  value: Priority | null;
  onValueChange: (value: Priority) => void;
  disabled?: boolean;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  high: {
    label: "Alta",
    icon: "🔴",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800"
  },
  medium: {
    label: "Média", 
    icon: "🟡",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800"
  },
  low: {
    label: "Baixa",
    icon: "🟢", 
    bgColor: "bg-green-50 dark:bg-green-950/20",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800"
  }
};

export function PrioritySelect({ value, onValueChange, disabled, className }: PrioritySelectProps) {
  const config = value ? priorityConfig[value] : null;
  
  const handleValueChange = (newValue: string) => {
    if (newValue === "__clear__") {
      onValueChange(null as any);
    } else {
      onValueChange(newValue as Priority);
    }
  };
  
  return (
    <Select value={value ?? undefined} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={`w-[100px] h-8 px-2 text-xs ${config ? `${config.bgColor} ${config.borderColor}` : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} ${className || ''}`}>
        <SelectValue placeholder="🔥">
          {config && (
            <div className="flex items-center gap-1">
              <span className="text-xs">{config.icon}</span>
              <span className={`text-xs font-medium ${config.textColor} hidden sm:inline`}>{config.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear__" className="py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">✖️</span>
            <span className="text-xs font-medium">Nenhuma</span>
          </div>
        </SelectItem>
        {Object.entries(priorityConfig).map(([key, conf]) => (
          <SelectItem key={key} value={key} className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{conf.icon}</span>
              <span className="text-xs font-medium">{conf.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 