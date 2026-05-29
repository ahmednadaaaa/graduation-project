import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { AdminRoute } from "@/utils/data";

const formSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  assignedBus: z.string().min(1, "Assigned bus is required"),
  stops: z.array(z.object({
    name: z.string().min(1, "Stop name is required"),
  })).min(2, "At least 2 stops are required"),
  status: z.enum(["active", "inactive"]),
});

interface RouteFormProps {
  initialData?: Route;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const RouteForm: React.FC<RouteFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      stops: initialData.stops.map(s => ({ name: s }))
    } : {
      name: "",
      assignedBus: "",
      stops: [{ name: "" }, { name: "" }],
      status: "active",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Route Name</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Downtown Express" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedBus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Bus</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bus" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SB-101">SB-101</SelectItem>
                    <SelectItem value="SB-102">SB-102</SelectItem>
                    <SelectItem value="SB-103">SB-103</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Route Stops (Ordered)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "" })}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Stop
            </Button>
          </div>
          
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-[10px] font-bold">
                  {index + 1}
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <FormField
                  control={form.control}
                  name={`stops.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder={`Stop ${index + 1} name`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={isLoading || fields.length <= 2}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          {form.formState.errors.stops?.root && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.stops.root.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {initialData ? "Save Changes" : "Create Route"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
