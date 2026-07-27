"use client"

import {
  UserPlus, UserMinus, DollarSign, Umbrella, Calculator, Clock,
  Phone, Gift, Bus, Monitor, Percent, Shield, ShieldCheck, HelpCircle,
  MapPin, Utensils, Heart, Smile, FileText, Database, FileCheck,
  BarChart2, Search, CheckCircle, Building2, Users, Briefcase,
  Circle, Plus, Minus, Star, Award, Target, Layers,
} from "lucide-react"

const MAP: Record<string, React.ElementType> = {
  "user-plus":   UserPlus,
  "user-minus":  UserMinus,
  "dollar-sign": DollarSign,
  "umbrella":    Umbrella,
  "calculator":  Calculator,
  "clock":       Clock,
  "phone":       Phone,
  "gift":        Gift,
  "bus":         Bus,
  "monitor":     Monitor,
  "percent":     Percent,
  "shield":      Shield,
  "shield-check":ShieldCheck,
  "help-circle": HelpCircle,
  "map-pin":     MapPin,
  "utensils":    Utensils,
  "heart":       Heart,
  "smile":       Smile,
  "file-text":   FileText,
  "database":    Database,
  "file-check":  FileCheck,
  "bar-chart-2": BarChart2,
  "search":      Search,
  "check-circle":CheckCircle,
  "building":    Building2,
  "users":       Users,
  "briefcase":   Briefcase,
  "plus":        Plus,
  "minus":       Minus,
  "star":        Star,
  "award":       Award,
  "target":      Target,
  "layers":      Layers,
}

export function OrgIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Circle
  return <Icon className={className} />
}

export function getIconNames(): string[] {
  return Object.keys(MAP)
}
