declare module 'react-hook-form' {
  export function useForm<TFieldValues = any, TContext = any>(props?: any): any;
  export function useController(props?: any): any;
  export function useFormContext(): any;
  export function useWatch(props?: any): any;
  export function useFieldArray(props?: any): any;
  export const Controller: any;
  export type UseFormReturn<T = any> = any;
  export type FieldValues = Record<string, any>;
  export type SubmitHandler<T = any> = (data: T) => void | Promise<void>;
  export type UseFormRegister<T = any> = any;
  export type Control<T = any> = any;
  export type FieldErrors<T = any> = any;
}
