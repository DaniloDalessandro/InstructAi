"use client";

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight, Building2, Users, Target } from "lucide-react";

interface HierarchicalBreadcrumbsProps {
  activeLevel: 'directions' | 'managements' | 'coordinations';
  selectedDirection?: {
    id: number;
    name: string;
  };
  selectedManagement?: {
    id: number;
    name: string;
  };
  onLevelChange: (level: 'directions' | 'managements' | 'coordinations') => void;
}

export function HierarchicalBreadcrumbs({ 
  activeLevel, 
  selectedDirection, 
  selectedManagement, 
  onLevelChange 
}: HierarchicalBreadcrumbsProps) {
  return (
    <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg border">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center space-x-2">
          <BreadcrumbItem>
            <BreadcrumbLink 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLevelChange('directions');
              }}
              className={`flex items-center space-x-2 text-sm font-medium transition-colors
                ${activeLevel === 'directions' 
                  ? 'text-blue-600 font-semibold' 
                  : 'text-gray-600 hover:text-blue-600'
                }`}
            >
              <Building2 size={16} />
              <span>
                {activeLevel === 'directions' ? 'Direções' : 'Direções'}
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {(selectedDirection || activeLevel !== 'directions') && (
            <>
              <BreadcrumbSeparator>
                <ChevronRight size={16} className="text-gray-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {selectedDirection ? (
                  <BreadcrumbLink 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onLevelChange('managements');
                    }}
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors
                      ${activeLevel === 'managements' 
                        ? 'text-blue-600 font-semibold' 
                        : 'text-gray-600 hover:text-blue-600'
                      }`}
                  >
                    <Users size={16} />
                    <span>
                      {activeLevel === 'managements' 
                        ? `Gerências - ${selectedDirection.name}` 
                        : 'Gerências'
                      }
                    </span>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className={`flex items-center space-x-2 text-sm font-medium
                    ${activeLevel === 'managements' 
                      ? 'text-blue-600 font-semibold' 
                      : 'text-gray-500'
                    }`}
                  >
                    <Users size={16} />
                    <span>Gerências</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}

          {(selectedManagement || activeLevel === 'coordinations') && (
            <>
              <BreadcrumbSeparator>
                <ChevronRight size={16} className="text-gray-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {selectedManagement ? (
                  <BreadcrumbPage className={`flex items-center space-x-2 text-sm font-medium
                    ${activeLevel === 'coordinations' 
                      ? 'text-blue-600 font-semibold' 
                      : 'text-gray-500'
                    }`}
                  >
                    <Target size={16} />
                    <span>
                      {activeLevel === 'coordinations' 
                        ? `Coordenações - ${selectedManagement.name}` 
                        : 'Coordenações'
                      }
                    </span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbPage className={`flex items-center space-x-2 text-sm font-medium
                    ${activeLevel === 'coordinations' 
                      ? 'text-blue-600 font-semibold' 
                      : 'text-gray-500'
                    }`}
                  >
                    <Target size={16} />
                    <span>Coordenações</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}