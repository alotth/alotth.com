import { WorkflowStatus } from "@/types/mindmap";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkflowSelectProps {
  value: WorkflowStatus | null;
  onValueChange: (value: WorkflowStatus) => void;
  disabled?: boolean;
  className?: string;
}

const workflowConfig: Record<WorkflowStatus, { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  todo: {
    label: "To Do",
    icon: "📋",
    bgColor: "bg-gray-50 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-200 dark:border-gray-700"
  },
  in_progress: {
    label: "Em Progresso", 
    icon: "⚡",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  done: {
    label: "Concluído",
    icon: "✅", 
    bgColor: "bg-green-50 dark:bg-green-950/20",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800"
  },
  blocked: {
    label: "Bloqueado",
    icon: "🚫",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800"
  }
};

export function WorkflowSelect({ value, onValueChange, disabled, className }: WorkflowSelectProps) {
  const config = value ? workflowConfig[value] : null;
  
  const handleValueChange = (newValue: string) => {
    if (newValue === "__clear__") {
      onValueChange(null as any);
    } else {
      onValueChange(newValue as WorkflowStatus);
    }
  };
  
  return (
    <Select value={value ?? undefined} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={`w-[120px] h-8 px-2 text-xs ${config ? `${config.bgColor} ${config.borderColor}` : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} ${className || ''}`}>
        <SelectValue placeholder="📋">
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
            <span className="text-xs font-medium">Nenhum</span>
          </div>
        </SelectItem>
        {Object.entries(workflowConfig).map(([key, conf]) => (
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