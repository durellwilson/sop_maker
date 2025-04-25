import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type SopStep = {
  id: string;
  step_number?: number;
  order_index?: number;
  title: string;
  description?: string;
};

type Sop = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  sop_steps: SopStep[];
};

interface SopListProps {
  sops: Sop[];
}

export default function SOPList({ sops }: SopListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sops.map((sop) => (
        <SopCard key={sop.id} sop={sop} />
      ))}
    </div>
  );
}

function SopCard({ sop }: { sop: Sop }) {
  const stepCount = sop.sop_steps?.length || 0;
  const lastUpdated = formatDistanceToNow(new Date(sop.updated_at), { addSuffix: true });
  
  return (
    <Link 
      href={`/sops/${sop.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
    >
      <div className="p-5">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{sop.title}</h3>
        
        {sop.description && (
          <p className="text-gray-600 mb-4 line-clamp-3">{sop.description}</p>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{stepCount} {stepCount === 1 ? 'step' : 'steps'}</span>
          <span>Updated {lastUpdated}</span>
        </div>
      </div>
      
      {stepCount > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
          <h4 className="font-medium text-gray-700 mb-2">Steps:</h4>
          <ul className="space-y-1">
            {sop.sop_steps
              .sort((a, b) => {
                // Use step_number if available, otherwise use order_index
                const aIndex = a.step_number !== undefined ? a.step_number : (a.order_index || 0);
                const bIndex = b.step_number !== undefined ? b.step_number : (b.order_index || 0);
                return aIndex - bIndex;
              })
              .slice(0, 3)
              .map((step) => (
                <li key={step.id} className="text-sm text-gray-600 line-clamp-1">
                  {step.step_number || step.order_index || '?'}. {step.title}
                </li>
              ))}
            {stepCount > 3 && (
              <li className="text-sm text-blue-600 font-medium">
                +{stepCount - 3} more steps
              </li>
            )}
          </ul>
        </div>
      )}
    </Link>
  );
} 