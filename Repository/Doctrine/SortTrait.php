<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\ORM\EntityManager;

trait SortTrait
{
    /**
     * {@inheritdoc}
     * @return \Doctrine\ORM\QueryBuilder
     */
    public abstract function createQueryBuilder($alias);

    public abstract function findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null);

    /**
     * @return EntityManager
     */
    protected abstract function getEntityManager();

    public function sort($id, $direction = 1)
    {
        $all = $this->findBy([], ['sort' => 'ASC']);

        $i = 0;

        $prev = null;
        $entity = null;
        $toChange = null;

        if ($direction === "0") {
            $direction = 0;
        }

        foreach ($all as $one) {
            $one->setSort($i);
            $this->getEntityManager()->persist($one);

            //Order is important!!
            if ($entity && !$toChange) {
                $toChange = $one;
            }

            if ($one->getId() == $id) {
                $entity = $one;

                if (!$direction) {
                    $toChange = $prev ? $prev : 1;
                }
            }

            $prev = $one;
            $i++;
        }

        $direction = ($direction ? 1 : -1);

        if (is_object($toChange)) {
            $toChange->setSort($toChange->getSort() - $direction);
            $entity->setSort($entity->getSort() + $direction);
        }

        $this->getEntityManager()->flush();

        return ['entity' => $entity, 'changed' => $toChange];
    }
} 