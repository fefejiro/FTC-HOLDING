import type { SupportedLocale } from "../localization/LocalizationProvider";

type TaskCopy = Readonly<{
  title: string;
  body: string;
  taskLabel: string;
  taskPlaceholder: string;
  dueDateLabel: string;
  dueDateHint: string;
  sharedLabel: string;
  sharedBody: string;
  add: string;
  open: string;
  completed: string;
  noneOpen: string;
  noneCompleted: string;
  due: (value: string) => string;
  private: string;
  shared: string;
  complete: string;
  reopen: string;
  delete: string;
  invalidDate: string;
  required: string;
}>;

const copy: Record<SupportedLocale, TaskCopy> = {
  en: {
    title: "Tasks",
    body: "Keep small parenting commitments clear and in one place.",
    taskLabel: "Task",
    taskPlaceholder: "Add a task",
    dueDateLabel: "Due date (optional)",
    dueDateHint: "Use YYYY-MM-DD.",
    sharedLabel: "Share with the other parent",
    sharedBody: "Only share this task when you choose to.",
    add: "Add task",
    open: "Open",
    completed: "Completed",
    noneOpen: "No open tasks yet.",
    noneCompleted: "No completed tasks yet.",
    due: (value) => `Due ${value}`,
    private: "Private",
    shared: "Shared",
    complete: "Mark complete",
    reopen: "Reopen task",
    delete: "Delete",
    invalidDate: "Use a valid date in YYYY-MM-DD format.",
    required: "Add a short task first."
  },
  fr: {
    title: "Tâches",
    body: "Gardez les petits engagements parentaux clairs, au même endroit.",
    taskLabel: "Tâche",
    taskPlaceholder: "Ajouter une tâche",
    dueDateLabel: "Date limite (facultative)",
    dueDateHint: "Utilisez AAAA-MM-JJ.",
    sharedLabel: "Partager avec l'autre parent",
    sharedBody: "Partagez cette tâche seulement lorsque vous le choisissez.",
    add: "Ajouter la tâche",
    open: "À faire",
    completed: "Terminées",
    noneOpen: "Aucune tâche à faire.",
    noneCompleted: "Aucune tâche terminée.",
    due: (value) => `À faire avant le ${value}`,
    private: "Privée",
    shared: "Partagée",
    complete: "Marquer comme terminée",
    reopen: "Rouvrir la tâche",
    delete: "Supprimer",
    invalidDate: "Utilisez une date valide au format AAAA-MM-JJ.",
    required: "Ajoutez d'abord une courte tâche."
  },
  es: {
    title: "Tareas",
    body: "Mantén los pequeños compromisos de crianza claros y en un solo lugar.",
    taskLabel: "Tarea",
    taskPlaceholder: "Añadir una tarea",
    dueDateLabel: "Fecha límite (opcional)",
    dueDateHint: "Usa AAAA-MM-DD.",
    sharedLabel: "Compartir con el otro progenitor",
    sharedBody: "Comparte esta tarea solo cuando lo decidas.",
    add: "Añadir tarea",
    open: "Pendientes",
    completed: "Completadas",
    noneOpen: "Aún no hay tareas pendientes.",
    noneCompleted: "Aún no hay tareas completadas.",
    due: (value) => `Fecha límite: ${value}`,
    private: "Privada",
    shared: "Compartida",
    complete: "Marcar como completada",
    reopen: "Reabrir tarea",
    delete: "Eliminar",
    invalidDate: "Usa una fecha válida con el formato AAAA-MM-DD.",
    required: "Añade primero una tarea breve."
  }
};

export function taskCopy(locale: SupportedLocale): TaskCopy {
  return copy[locale];
}
