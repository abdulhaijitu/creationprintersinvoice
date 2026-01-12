export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          business_name: string
          created_at: string
          due_date: string
          generated_date: string
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          owner_email: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          plan_name: string
          status: string
          tax: number | null
          total_payable: number
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_period_end: string
          billing_period_start: string
          business_name: string
          created_at?: string
          due_date: string
          generated_date?: string
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          owner_email?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_name?: string
          status?: string
          tax?: number | null
          total_payable?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string
          billing_period_start?: string
          business_name?: string
          created_at?: string
          due_date?: string
          generated_date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          owner_email?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_name?: string
          status?: string
          tax?: number | null
          total_payable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          address_bn: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          company_name: string
          company_name_bn: string | null
          created_at: string
          email: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string | null
          invoice_terms: string | null
          logo_url: string | null
          mobile_banking: string | null
          phone: string | null
          quotation_prefix: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          address_bn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          company_name?: string
          company_name_bn?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          address_bn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          company_name?: string
          company_name_bn?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_deleted: boolean
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challan_items: {
        Row: {
          challan_id: string
          created_at: string
          description: string
          id: string
          invoice_item_id: string | null
          organization_id: string | null
          quantity: number
          unit: string | null
        }
        Insert: {
          challan_id: string
          created_at?: string
          description: string
          id?: string
          invoice_item_id?: string | null
          organization_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Update: {
          challan_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_item_id?: string | null
          organization_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challan_items_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          challan_date: string
          challan_number: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_address: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string | null
          status: string
          updated_at: string
          vehicle_info: string | null
        }
        Insert: {
          challan_date?: string
          challan_number: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          vehicle_info?: string | null
        }
        Update: {
          challan_date?: string
          challan_number?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_cleanup_logs: {
        Row: {
          cleaned_by: string | null
          cleanup_reason: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          records_deleted: number
        }
        Insert: {
          cleaned_by?: string | null
          cleanup_reason: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          records_deleted?: number
        }
        Update: {
          cleaned_by?: string | null
          cleanup_reason?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          records_deleted?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_cleanup_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_data_records: {
        Row: {
          cleanup_after: string | null
          cleanup_on_first_real_data: boolean
          created_at: string
          id: string
          organization_id: string
          record_id: string
          table_name: string
        }
        Insert: {
          cleanup_after?: string | null
          cleanup_on_first_real_data?: boolean
          created_at?: string
          id?: string
          organization_id: string
          record_id: string
          table_name: string
        }
        Update: {
          cleanup_after?: string | null
          cleanup_on_first_real_data?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_data_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_advances: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          deducted_from_month: number | null
          deducted_from_year: number | null
          employee_id: string
          id: string
          organization_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          employee_id: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          employee_id?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_history: {
        Row: {
          created_at: string
          effective_date: string
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          salary_amount: number
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          effective_date?: string
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          salary_amount: number
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          salary_amount?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_records: {
        Row: {
          advance: number | null
          basic_salary: number
          bonus: number | null
          created_at: string | null
          deductions: number | null
          employee_id: string
          id: string
          month: number
          net_payable: number
          notes: string | null
          organization_id: string | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_date: string | null
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          advance?: number | null
          basic_salary: number
          bonus?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          month: number
          net_payable: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          advance?: number | null
          basic_salary?: number
          bonus?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          month?: number
          net_payable?: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          basic_salary: number | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          joining_date: string | null
          nid: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          nid?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          nid?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_audit_logs: {
        Row: {
          action_label: string
          action_type: Database["public"]["Enums"]["audit_action_type"]
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          actor_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          organization_name: string | null
          source: Database["public"]["Enums"]["audit_source"]
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action_label: string
          action_type: Database["public"]["Enums"]["audit_action_type"]
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          organization_name?: string | null
          source?: Database["public"]["Enums"]["audit_source"]
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action_label?: string
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          organization_name?: string | null
          source?: Database["public"]["Enums"]["audit_source"]
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          organization_id: string | null
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
          updated_by: string | null
          vendor_bill_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      global_notification_settings: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          id: string
          is_enabled: boolean | null
          provider_config: Json | null
          rate_limit_per_minute: number | null
          updated_at: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider_config?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider_config?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount: number | null
          id: string
          invoice_id: string
          organization_id: string | null
          quantity: number
          total: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number | null
          id?: string
          invoice_id: string
          organization_id?: string | null
          quantity?: number
          total: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number | null
          id?: string
          invoice_id?: string
          organization_id?: string | null
          quantity?: number
          total?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          created_at: string
          current_sequence: number
          id: string
          last_migration_at: string | null
          organization_id: string
          prefix: string | null
          starting_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_sequence?: number
          id?: string
          last_migration_at?: string | null
          organization_id: string
          prefix?: string | null
          starting_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_sequence?: number
          id?: string
          last_migration_at?: string | null
          organization_id?: string
          prefix?: string | null
          starting_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_no_raw: number | null
          invoice_number: string
          notes: string | null
          organization_id: string | null
          paid_amount: number | null
          source_quotation_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no_raw?: number | null
          invoice_number: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          source_quotation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no_raw?: number | null
          invoice_number?: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          source_quotation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          annual_total: number | null
          annual_used: number | null
          casual_total: number | null
          casual_used: number | null
          created_at: string
          id: string
          organization_id: string | null
          sick_total: number | null
          sick_used: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string | null
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          organization_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          external_id: string | null
          failed_reason: string | null
          id: string
          max_retries: number | null
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string | null
          recipient: string
          retry_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          external_id?: string | null
          failed_reason?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id?: string | null
          recipient: string
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          external_id?: string | null
          failed_reason?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          organization_id?: string | null
          recipient?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_analytics: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          skipped_at: string | null
          started_at: string | null
          status: string
          step_key: string
          step_name: string
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          step_key: string
          step_name: string
          updated_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          step_key?: string
          step_name?: string
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_steps: number
          created_at: string
          id: string
          is_completed: boolean
          organization_id: string
          skipped_steps: number
          started_at: string | null
          total_steps: number
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          organization_id: string
          skipped_steps?: number
          started_at?: string | null
          total_steps?: number
          updated_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          id?: string
          is_completed?: boolean
          organization_id?: string
          skipped_steps?: number
          started_at?: string | null
          total_steps?: number
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_permission_settings: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          override_plan_permissions: boolean | null
          updated_at: string
          use_global_permissions: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          override_plan_permissions?: boolean | null
          updated_at?: string
          use_global_permissions?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          override_plan_permissions?: boolean | null
          updated_at?: string
          use_global_permissions?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_permission_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_role_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          is_protected: boolean
          permission_category: string
          permission_key: string
          permission_label: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_protected?: boolean
          permission_category: string
          permission_key: string
          permission_label: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_protected?: boolean
          permission_category?: string
          permission_key?: string
          permission_label?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_specific_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          organization_id: string
          permission_key: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          permission_key: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          permission_key?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_specific_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string | null
          app_name: string | null
          created_at: string
          favicon_url: string | null
          footer_text: string | null
          hide_platform_branding: boolean | null
          id: string
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          app_name?: string | null
          created_at?: string
          favicon_url?: string | null
          footer_text?: string | null
          hide_platform_branding?: boolean | null
          id?: string
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          app_name?: string | null
          created_at?: string
          favicon_url?: string | null
          footer_text?: string | null
          hide_platform_branding?: boolean | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          organization_id: string
          ssl_status: string | null
          updated_at: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          organization_id: string
          ssl_status?: string | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          organization_id?: string
          ssl_status?: string | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_email_branding: {
        Row: {
          created_at: string
          email_footer: string | null
          id: string
          organization_id: string
          reply_to_email: string | null
          sender_email: string | null
          sender_name: string | null
          sms_sender_label: string | null
          updated_at: string
          whatsapp_sender_label: string | null
        }
        Insert: {
          created_at?: string
          email_footer?: string | null
          id?: string
          organization_id: string
          reply_to_email?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sms_sender_label?: string | null
          updated_at?: string
          whatsapp_sender_label?: string | null
        }
        Update: {
          created_at?: string
          email_footer?: string | null
          id?: string
          organization_id?: string
          reply_to_email?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sms_sender_label?: string | null
          updated_at?: string
          whatsapp_sender_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_email_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          note: string | null
          organization_id: string
          role: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          organization_id: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notification_settings: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          organization_id: string
          timezone: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id: string
          timezone?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string
          timezone?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notification_types: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_notification_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage_stats: {
        Row: {
          created_at: string
          id: string
          last_activity_at: string | null
          login_count: number
          organization_id: string
          stat_date: string
          total_customers: number
          total_employees: number
          total_expenses: number
          total_invoices: number
          total_payments: number
          total_quotations: number
          total_users: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_at?: string | null
          login_count?: number
          organization_id: string
          stat_date?: string
          total_customers?: number
          total_employees?: number
          total_expenses?: number
          total_invoices?: number
          total_payments?: number
          total_quotations?: number
          total_users?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_at?: string | null
          login_count?: number
          organization_id?: string
          stat_date?: string
          total_customers?: number
          total_employees?: number
          total_expenses?: number
          total_invoices?: number
          total_payments?: number
          total_quotations?: number
          total_users?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_whitelabel_settings: {
        Row: {
          created_at: string
          custom_domain_enabled: boolean | null
          email_branding_enabled: boolean | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          notes: string | null
          organization_id: string
          pdf_branding_enabled: boolean | null
          updated_at: string
          whitelabel_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          custom_domain_enabled?: boolean | null
          email_branding_enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pdf_branding_enabled?: boolean | null
          updated_at?: string
          whitelabel_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          custom_domain_enabled?: boolean | null
          email_branding_enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pdf_branding_enabled?: boolean | null
          updated_at?: string
          whitelabel_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_whitelabel_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          challan_prefix: string | null
          created_at: string
          email: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string | null
          invoice_terms: string | null
          logo_url: string | null
          mobile_banking: string | null
          name: string
          owner_email: string | null
          owner_id: string | null
          phone: string | null
          quotation_prefix: string | null
          slug: string
          tax_rate: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          challan_prefix?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          name: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          slug: string
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          challan_prefix?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          name?: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          slug?: string
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ownership_history: {
        Row: {
          action_type: string
          actor_id: string
          actor_type: string
          created_at: string
          id: string
          new_owner_id: string | null
          note: string | null
          organization_id: string
          previous_owner_id: string | null
          transfer_request_id: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_type: string
          created_at?: string
          id?: string
          new_owner_id?: string | null
          note?: string | null
          organization_id: string
          previous_owner_id?: string | null
          transfer_request_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_type?: string
          created_at?: string
          id?: string
          new_owner_id?: string | null
          note?: string | null
          organization_id?: string
          previous_owner_id?: string | null
          transfer_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_history_transfer_request_id_fkey"
            columns: ["transfer_request_id"]
            isOneToOne: false
            referencedRelation: "ownership_transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_transfer_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          organization_id: string
          rejection_reason: string | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          rejection_reason?: string | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          rejection_reason?: string | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          organization_id: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          organization_id?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          organization_id?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          customer_limit: number
          employee_limit: number
          expense_limit: number
          id: string
          invoice_limit: number
          plan_name: string
          quotation_limit: number
          updated_at: string
          user_limit: number
        }
        Insert: {
          created_at?: string
          customer_limit?: number
          employee_limit?: number
          expense_limit?: number
          id?: string
          invoice_limit?: number
          plan_name: string
          quotation_limit?: number
          updated_at?: string
          user_limit?: number
        }
        Update: {
          created_at?: string
          customer_limit?: number
          employee_limit?: number
          expense_limit?: number
          id?: string
          invoice_limit?: number
          plan_name?: string
          quotation_limit?: number
          updated_at?: string
          user_limit?: number
        }
        Relationships: []
      }
      plan_permission_presets: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          plan_name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          plan_name: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          plan_name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          annual_price: number | null
          created_at: string
          currency: string
          id: string
          is_active: boolean | null
          monthly_price: number
          plan_name: string
          updated_at: string
        }
        Insert: {
          annual_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          plan_name: string
          updated_at?: string
        }
        Update: {
          annual_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          plan_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_upgrade_requests: {
        Row: {
          created_at: string
          current_plan: string
          id: string
          organization_id: string
          organization_name: string
          requested_at: string
          requested_by: string | null
          requested_plan: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_plan: string
          id?: string
          organization_id: string
          organization_name: string
          requested_at?: string
          requested_by?: string | null
          requested_plan: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_plan?: string
          id?: string
          organization_id?: string
          organization_name?: string
          requested_at?: string
          requested_by?: string | null
          requested_plan?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_upgrade_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_calculations: {
        Row: {
          binding_cost: number | null
          binding_price: number | null
          binding_qty: number | null
          costing_total: number | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          design_cost: number | null
          design_price: number | null
          design_qty: number | null
          die_cutting_cost: number | null
          die_cutting_price: number | null
          die_cutting_qty: number | null
          final_price: number | null
          foil_printing_price: number | null
          foil_printing_qty: number | null
          foil_printing_total: number | null
          id: string
          invoice_id: string | null
          job_description: string
          lamination_cost: number | null
          lamination_price: number | null
          lamination_qty: number | null
          margin_amount: number | null
          margin_percent: number | null
          organization_id: string | null
          others_cost: number | null
          others_price: number | null
          others_qty: number | null
          paper1_price: number | null
          paper1_qty: number | null
          paper1_total: number | null
          paper2_price: number | null
          paper2_qty: number | null
          paper2_total: number | null
          paper3_price: number | null
          paper3_qty: number | null
          paper3_total: number | null
          plate_price: number | null
          plate_qty: number | null
          plate_total: number | null
          plate2_price: number | null
          plate2_qty: number | null
          plate2_total: number | null
          plate3_price: number | null
          plate3_qty: number | null
          plate3_total: number | null
          price_per_pcs: number | null
          print_price: number | null
          print_qty: number | null
          print_total: number | null
          print2_price: number | null
          print2_qty: number | null
          print2_total: number | null
          print3_price: number | null
          print3_qty: number | null
          print3_total: number | null
          quantity: number | null
          quotation_id: string | null
          updated_at: string
        }
        Insert: {
          binding_cost?: number | null
          binding_price?: number | null
          binding_qty?: number | null
          costing_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          design_cost?: number | null
          design_price?: number | null
          design_qty?: number | null
          die_cutting_cost?: number | null
          die_cutting_price?: number | null
          die_cutting_qty?: number | null
          final_price?: number | null
          foil_printing_price?: number | null
          foil_printing_qty?: number | null
          foil_printing_total?: number | null
          id?: string
          invoice_id?: string | null
          job_description: string
          lamination_cost?: number | null
          lamination_price?: number | null
          lamination_qty?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          organization_id?: string | null
          others_cost?: number | null
          others_price?: number | null
          others_qty?: number | null
          paper1_price?: number | null
          paper1_qty?: number | null
          paper1_total?: number | null
          paper2_price?: number | null
          paper2_qty?: number | null
          paper2_total?: number | null
          paper3_price?: number | null
          paper3_qty?: number | null
          paper3_total?: number | null
          plate_price?: number | null
          plate_qty?: number | null
          plate_total?: number | null
          plate2_price?: number | null
          plate2_qty?: number | null
          plate2_total?: number | null
          plate3_price?: number | null
          plate3_qty?: number | null
          plate3_total?: number | null
          price_per_pcs?: number | null
          print_price?: number | null
          print_qty?: number | null
          print_total?: number | null
          print2_price?: number | null
          print2_qty?: number | null
          print2_total?: number | null
          print3_price?: number | null
          print3_qty?: number | null
          print3_total?: number | null
          quantity?: number | null
          quotation_id?: string | null
          updated_at?: string
        }
        Update: {
          binding_cost?: number | null
          binding_price?: number | null
          binding_qty?: number | null
          costing_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          design_cost?: number | null
          design_price?: number | null
          design_qty?: number | null
          die_cutting_cost?: number | null
          die_cutting_price?: number | null
          die_cutting_qty?: number | null
          final_price?: number | null
          foil_printing_price?: number | null
          foil_printing_qty?: number | null
          foil_printing_total?: number | null
          id?: string
          invoice_id?: string | null
          job_description?: string
          lamination_cost?: number | null
          lamination_price?: number | null
          lamination_qty?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          organization_id?: string | null
          others_cost?: number | null
          others_price?: number | null
          others_qty?: number | null
          paper1_price?: number | null
          paper1_qty?: number | null
          paper1_total?: number | null
          paper2_price?: number | null
          paper2_qty?: number | null
          paper2_total?: number | null
          paper3_price?: number | null
          paper3_qty?: number | null
          paper3_total?: number | null
          plate_price?: number | null
          plate_qty?: number | null
          plate_total?: number | null
          plate2_price?: number | null
          plate2_qty?: number | null
          plate2_total?: number | null
          plate3_price?: number | null
          plate3_qty?: number | null
          plate3_total?: number | null
          price_per_pcs?: number | null
          print_price?: number | null
          print_qty?: number | null
          print_total?: number | null
          print2_price?: number | null
          print2_qty?: number | null
          print2_total?: number | null
          print3_price?: number | null
          print3_qty?: number | null
          print3_total?: number | null
          quantity?: number | null
          quotation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      print_orders: {
        Row: {
          advance_paid: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          design_file_url: string | null
          design_notes: string | null
          due_date: string | null
          finishing: string | null
          height_inches: number | null
          id: string
          material: string | null
          notes: string | null
          order_date: string | null
          order_number: string
          print_type: string
          quantity: number
          size: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number | null
          unit_price: number | null
          updated_at: string | null
          width_inches: number | null
        }
        Insert: {
          advance_paid?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          design_file_url?: string | null
          design_notes?: string | null
          due_date?: string | null
          finishing?: string | null
          height_inches?: number | null
          id?: string
          material?: string | null
          notes?: string | null
          order_date?: string | null
          order_number: string
          print_type: string
          quantity?: number
          size?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          width_inches?: number | null
        }
        Update: {
          advance_paid?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          design_file_url?: string | null
          design_notes?: string | null
          due_date?: string | null
          finishing?: string | null
          height_inches?: number | null
          id?: string
          material?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          print_type?: string
          quantity?: number
          size?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
          width_inches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "print_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "shop_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          basic_salary: number | null
          created_at: string
          department: string | null
          designation: string | null
          first_login_completed: boolean | null
          full_name: string
          id: string
          joining_date: string | null
          nid: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          first_login_completed?: boolean | null
          full_name: string
          id: string
          joining_date?: string | null
          nid?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          first_login_completed?: boolean | null
          full_name?: string
          id?: string
          joining_date?: string | null
          nid?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          discount: number | null
          id: string
          organization_id: string | null
          quantity: number
          quotation_id: string
          total: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number | null
          id?: string
          organization_id?: string | null
          quantity?: number
          quotation_id: string
          total: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number | null
          id?: string
          organization_id?: string | null
          quantity?: number
          quotation_id?: string
          total?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_sequences: {
        Row: {
          created_at: string
          current_sequence: number
          id: string
          organization_id: string
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_sequence?: number
          id?: string
          organization_id: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          current_sequence?: number
          id?: string
          organization_id?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          converted_at: string | null
          converted_by: string | null
          converted_invoice_id: string | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number | null
          id: string
          notes: string | null
          organization_id: string | null
          quotation_date: string
          quotation_number: string
          status: Database["public"]["Enums"]["quotation_status"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          converted_at?: string | null
          converted_by?: string | null
          converted_invoice_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quotation_date?: string
          quotation_number: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          converted_at?: string | null
          converted_by?: string | null
          converted_invoice_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quotation_date?: string
          quotation_number?: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_snapshots: {
        Row: {
          active_subscriptions: number
          churned_subscriptions: number
          contraction_revenue: number | null
          created_at: string
          expansion_revenue: number | null
          id: string
          new_subscriptions: number
          plan_breakdown: Json | null
          snapshot_date: string
          total_arr: number
          total_mrr: number
          trial_subscriptions: number
        }
        Insert: {
          active_subscriptions?: number
          churned_subscriptions?: number
          contraction_revenue?: number | null
          created_at?: string
          expansion_revenue?: number | null
          id?: string
          new_subscriptions?: number
          plan_breakdown?: Json | null
          snapshot_date?: string
          total_arr?: number
          total_mrr?: number
          trial_subscriptions?: number
        }
        Update: {
          active_subscriptions?: number
          churned_subscriptions?: number
          contraction_revenue?: number | null
          created_at?: string
          expansion_revenue?: number | null
          id?: string
          new_subscriptions?: number
          plan_breakdown?: Json | null
          snapshot_date?: string
          total_arr?: number
          total_mrr?: number
          trial_subscriptions?: number
        }
        Relationships: []
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          date: string
          deducted_from_month: number | null
          deducted_from_year: number | null
          id: string
          organization_id: string | null
          reason: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          advance: number | null
          basic_salary: number
          bonus: number | null
          created_at: string
          deductions: number | null
          employee_id: string | null
          id: string
          month: number
          net_payable: number
          notes: string | null
          organization_id: string | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_date: string | null
          status: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          advance?: number | null
          basic_salary: number
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          id?: string
          month: number
          net_payable: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          advance?: number | null
          basic_salary?: number
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          id?: string
          month?: number
          net_payable?: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_processed: boolean | null
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string
          processed_at: string | null
          reference_id: string | null
          reference_type: string | null
          scheduled_for: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          organization_id?: string
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_users: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["shop_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["shop_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["shop_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          from_plan: string | null
          id: string
          metadata: Json | null
          mrr_change: number | null
          organization_id: string
          to_plan: string | null
        }
        Insert: {
          created_at?: string
          event_date?: string
          event_type: string
          from_plan?: string | null
          id?: string
          metadata?: Json | null
          mrr_change?: number | null
          organization_id: string
          to_plan?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          from_plan?: string | null
          id?: string
          metadata?: Json | null
          mrr_change?: number | null
          organization_id?: string
          to_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          billing_invoice_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          failure_reason: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          initiated_at: string
          notes: string | null
          organization_id: string
          payer_email: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_method: string | null
          receipt_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          billing_invoice_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          failure_reason?: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          initiated_at?: string
          notes?: string | null
          organization_id: string
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          billing_invoice_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          failure_reason?: string | null
          gateway?: Database["public"]["Enums"]["payment_gateway"]
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          initiated_at?: string
          notes?: string | null
          organization_id?: string
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_billing_invoice_id_fkey"
            columns: ["billing_invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_limit: number | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          organization_id: string | null
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          organization_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          invite_token: string | null
          invite_token_expires_at: string | null
          invite_used_at: string | null
          must_reset_password: boolean | null
          password_reset_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invite_token?: string | null
          invite_token_expires_at?: string | null
          invite_used_at?: string | null
          must_reset_password?: boolean | null
          password_reset_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          invite_token?: string | null
          invite_token_expires_at?: string | null
          invite_used_at?: string | null
          must_reset_password?: boolean | null
          password_reset_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_bills: {
        Row: {
          amount: number
          bill_date: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          reference_no: string | null
          status: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          bill_date?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          reference_no?: string | null
          status?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_date?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          reference_no?: string | null
          status?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string
          payment_method: string | null
          reference_no: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_no?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_no?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_info: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      walkthrough_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          user_id: string
          walkthrough_key: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          user_id: string
          walkthrough_key: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          user_id?: string
          walkthrough_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_org_usage_stats: {
        Args: { org_id: string }
        Returns: {
          created_at: string
          id: string
          last_activity_at: string | null
          login_count: number
          organization_id: string
          stat_date: string
          total_customers: number
          total_employees: number
          total_expenses: number
          total_invoices: number
          total_payments: number
          total_quotations: number
          total_users: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_usage_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_saas_metrics: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      can_manage_company_settings: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_view_org_member_profile: {
        Args: { profile_id: string; viewer_id: string }
        Returns: boolean
      }
      check_overdue_invoices: { Args: never; Returns: undefined }
      fix_all_invoice_statuses: { Args: never; Returns: undefined }
      generate_billing_invoice_number: { Args: never; Returns: string }
      generate_challan_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_org_invoice_number: {
        Args: { p_org_id: string }
        Returns: string
      }
      generate_org_invoice_number_v2: {
        Args: { p_org_id: string }
        Returns: {
          invoice_no_raw: number
          invoice_number: string
        }[]
      }
      generate_org_quotation_number: {
        Args: { p_org_id: string }
        Returns: {
          quotation_no_raw: number
          quotation_number: string
        }[]
      }
      generate_payment_receipt_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_mrr_trend: {
        Args: { days_back?: number }
        Returns: {
          active_subscriptions: number
          arr: number
          mrr: number
          snapshot_date: string
        }[]
      }
      get_next_invoice_number_preview: {
        Args: { p_org_id: string }
        Returns: string
      }
      get_next_quotation_number_preview: {
        Args: { p_org_id: string }
        Returns: string
      }
      get_org_usage_percentage: {
        Args: { org_id: string }
        Returns: {
          current_usage: number
          feature: string
          plan_limit: number
          usage_percentage: number
        }[]
      }
      get_org_usage_stats: {
        Args: { _org_id: string }
        Returns: {
          expense_total: number
          invoice_count: number
          last_activity: string
        }[]
      }
      get_organization_by_domain: {
        Args: { domain_name: string }
        Returns: {
          branding: Json
          organization_id: string
          organization_name: string
        }[]
      }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_privileged_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_action_label?: string
          p_action_type?: string
          p_actor_email?: string
          p_actor_id?: string
          p_actor_role?: string
          p_actor_type?: string
          p_after_state?: Json
          p_before_state?: Json
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type?: string
          p_ip_address?: string
          p_metadata?: Json
          p_organization_id?: string
          p_organization_name?: string
          p_source?: string
          p_user_agent?: string
        }
        Returns: string
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_shop_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_shop_member: { Args: { check_user_id: string }; Returns: boolean }
      is_subscription_active: { Args: { _org_id: string }; Returns: boolean }
      log_password_reset_event: {
        Args: {
          p_action_type: string
          p_organization_id: string
          p_source: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_failed_payment: {
        Args: {
          p_failure_reason: string
          p_gateway_response: Json
          p_payment_id: string
        }
        Returns: boolean
      }
      process_successful_payment: {
        Args: {
          p_gateway_response: Json
          p_gateway_tx_id: string
          p_payment_id: string
        }
        Returns: boolean
      }
      render_notification_template: {
        Args: { template_text: string; variables: Json }
        Returns: string
      }
      schedule_billing_reminders: {
        Args: {
          p_due_date: string
          p_invoice_id: string
          p_organization_id: string
        }
        Returns: undefined
      }
      schedule_trial_reminders: {
        Args: { p_organization_id: string; p_trial_ends_at: string }
        Returns: undefined
      }
      update_invoice_sequence_settings: {
        Args: {
          p_org_id: string
          p_prefix?: string
          p_starting_number?: number
        }
        Returns: boolean
      }
      update_quotation_sequence_settings: {
        Args: {
          p_org_id: string
          p_prefix?: string
          p_starting_number?: number
        }
        Returns: boolean
      }
      update_quotation_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["quotation_status"]
          p_quotation_id: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_active_subscription: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "employee"
        | "super_admin"
        | "graphic_designer"
        | "manager"
        | "accounts"
        | "sales_staff"
      attendance_status: "present" | "absent" | "late" | "half_day"
      audit_action_type:
        | "login"
        | "logout"
        | "login_failed"
        | "create"
        | "update"
        | "delete"
        | "access"
        | "suspend"
        | "activate"
        | "configure"
        | "export"
        | "import"
        | "impersonate_start"
        | "impersonate_end"
      audit_source: "ui" | "api" | "system" | "edge_function" | "webhook"
      invoice_status: "unpaid" | "partial" | "paid"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "casual" | "sick" | "annual" | "other"
      notification_channel: "email" | "sms" | "whatsapp"
      notification_status: "pending" | "sent" | "failed" | "cancelled"
      notification_type:
        | "trial_started"
        | "trial_ending"
        | "trial_expired"
        | "invoice_generated"
        | "payment_due_soon"
        | "payment_due_today"
        | "payment_overdue"
        | "plan_activated"
        | "plan_expired"
        | "account_locked"
        | "account_unlocked"
        | "payment_success"
        | "payment_failed"
      order_status: "pending" | "in_progress" | "completed" | "delivered"
      org_role:
        | "owner"
        | "manager"
        | "accounts"
        | "staff"
        | "sales_staff"
        | "designer"
        | "employee"
      payment_gateway: "sslcommerz" | "bkash" | "nagad" | "rocket" | "manual"
      payment_status:
        | "initiated"
        | "pending"
        | "success"
        | "failed"
        | "cancelled"
        | "refunded"
      quotation_status:
        | "draft"
        | "sent"
        | "pending"
        | "accepted"
        | "converted"
        | "rejected"
      shop_role: "admin" | "staff"
      subscription_plan: "free" | "basic" | "pro" | "enterprise"
      subscription_status:
        | "trial"
        | "active"
        | "suspended"
        | "cancelled"
        | "expired"
      task_priority: "low" | "medium" | "high"
      task_status:
        | "todo"
        | "in_progress"
        | "completed"
        | "design"
        | "plate"
        | "printing"
        | "lamination"
        | "die_cutting"
        | "binding"
        | "packaging"
        | "delivered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "employee",
        "super_admin",
        "graphic_designer",
        "manager",
        "accounts",
        "sales_staff",
      ],
      attendance_status: ["present", "absent", "late", "half_day"],
      audit_action_type: [
        "login",
        "logout",
        "login_failed",
        "create",
        "update",
        "delete",
        "access",
        "suspend",
        "activate",
        "configure",
        "export",
        "import",
        "impersonate_start",
        "impersonate_end",
      ],
      audit_source: ["ui", "api", "system", "edge_function", "webhook"],
      invoice_status: ["unpaid", "partial", "paid"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["casual", "sick", "annual", "other"],
      notification_channel: ["email", "sms", "whatsapp"],
      notification_status: ["pending", "sent", "failed", "cancelled"],
      notification_type: [
        "trial_started",
        "trial_ending",
        "trial_expired",
        "invoice_generated",
        "payment_due_soon",
        "payment_due_today",
        "payment_overdue",
        "plan_activated",
        "plan_expired",
        "account_locked",
        "account_unlocked",
        "payment_success",
        "payment_failed",
      ],
      order_status: ["pending", "in_progress", "completed", "delivered"],
      org_role: [
        "owner",
        "manager",
        "accounts",
        "staff",
        "sales_staff",
        "designer",
        "employee",
      ],
      payment_gateway: ["sslcommerz", "bkash", "nagad", "rocket", "manual"],
      payment_status: [
        "initiated",
        "pending",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      quotation_status: [
        "draft",
        "sent",
        "pending",
        "accepted",
        "converted",
        "rejected",
      ],
      shop_role: ["admin", "staff"],
      subscription_plan: ["free", "basic", "pro", "enterprise"],
      subscription_status: [
        "trial",
        "active",
        "suspended",
        "cancelled",
        "expired",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: [
        "todo",
        "in_progress",
        "completed",
        "design",
        "plate",
        "printing",
        "lamination",
        "die_cutting",
        "binding",
        "packaging",
        "delivered",
      ],
    },
  },
} as const
