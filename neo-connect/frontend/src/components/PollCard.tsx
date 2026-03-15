'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Poll } from '../services/poll.service';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { formatDate } from '../utils/formatDate';

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#faf5ff'];

interface PollCardProps {
  poll: Poll;
  userRole?: string;
  onVote: (pollId: string, optionId: string) => void;
  onClose: (pollId: string) => void;
}

export default function PollCard({ poll, userRole, onVote, onClose }: PollCardProps) {
  const [selected, setSelected] = useState('');
  const showResults = poll.hasVoted || !poll.isOpen;

  const chartData = poll.options.map(opt => ({
    name: opt.text.length > 20 ? opt.text.slice(0, 20) + '…' : opt.text,
    fullText: opt.text,
    votes: opt.voteCount,
    pct: poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0,
  }));

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">{poll.question}</CardTitle>
          <Badge
            className={
              poll.isOpen
                ? 'bg-green-100 text-green-700 shrink-0'
                : 'bg-gray-100 text-gray-600 shrink-0'
            }
          >
            {poll.isOpen ? 'Open' : 'Closed'}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">Created {formatDate(poll.createdAt)}</p>
      </CardHeader>

      <CardContent>
        {showResults ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">{poll.totalVotes} total vote{poll.totalVotes !== 1 ? 's' : ''}</p>
            <ResponsiveContainer width="100%" height={poll.options.length * 44 + 20}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, _: string, props: { payload?: { pct?: number } }) =>
                    [`${value} votes (${props.payload?.pct ?? 0}%)`, '']
                  }
                  labelFormatter={(label: string) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.fullText ?? label;
                  }}
                />
                <Bar dataKey="votes" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}` }}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{poll.totalVotes} total vote{poll.totalVotes !== 1 ? 's' : ''} — cast your vote:</p>
            <RadioGroup value={selected} onValueChange={setSelected} className="space-y-1.5">
              {poll.options.map(opt => (
                <div key={opt.id} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted transition-colors cursor-pointer">
                  <RadioGroupItem value={opt.id} id={opt.id} />
                  <Label htmlFor={opt.id} className="cursor-pointer font-normal flex-1">{opt.text}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              size="sm"
              disabled={!selected}
              onClick={() => { onVote(poll.id, selected); setSelected(''); }}
            >
              Submit Vote
            </Button>
          </div>
        )}

        {userRole === 'SECRETARIAT' && poll.isOpen && (
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onClose(poll.id)}
            >
              Close Poll
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
