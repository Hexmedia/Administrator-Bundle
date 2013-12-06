<?php
/**
 * Created by PhpStorm.
 * User: krun
 * Date: 06.12.13
 * Time: 14:01
 */

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\ORM\AbstractQuery;


trait SoftDeleteTrait
{
    /**
     * @param string $alias
     * @return \Doctrine\ORM\QueryBuilder
     */
    public function createListQueryBuilder($alias)
    {
        $queryBuilder = $this->createQueryBuilder($alias);

        $this->addNotDeletedFilter($queryBuilder, $alias);

        return $queryBuilder;
    }

    public function getAllQueryBuilder($alias)
    {
        $queryBuilder = $this->createQueryBuilder($alias);

        return $queryBuilder;
    }

    public function getAll()
    {
        $queryBuilder = $this->getAllQueryBuilder("obj");

        $queryBuilder->where($this->addNotDeletedFilter($queryBuilder, "obj"));

        return $queryBuilder->getQuery()->getResult(AbstractQuery::HYDRATE_OBJECT);
    }

    public function getBy($where = [], $order = null, $limit = null, $offset = 0)
    {
        $queryBuilder = $this->getAllQueryBuilder("obj");

        $andX = $queryBuilder->expr()->andX(
            $this->addNotDeletedFilter($queryBuilder, "obj")
        );

        foreach ($where as $key => $val) {
            $andX->add($queryBuilder->expr()->eq("obj." . $key, ":$key"));
            $queryBuilder->setParameter(":$key", $val);
        }

        $queryBuilder->where($andX);

        if ($limit !== null) {
            $queryBuilder->setMaxResults($limit);
            $queryBuilder->setFirstResult($offset);
        }

        foreach ($order as $field => $direction) {
            $queryBuilder->orderBy("obj." . $field, $direction);
        }

        return $queryBuilder->getQuery()->getResult(AbstractQuery::HYDRATE_OBJECT);
    }

    public function getOneBy($criteria = [], $orderBy = null)
    {
        $entity = $this->findOneBy($criteria, $orderBy);

        if (!$entity || !$entity->isDeleted()) {
            return $entity;
        }
    }

    public function addNotDeletedFilter($queryBuilder, $alias)
    {
        $queryBuilder->setParameter(":when", new \DateTime());

        return $queryBuilder->expr()->orX(
            $queryBuilder->expr()->isNull("$alias.deletedAt"),
            $queryBuilder->expr()->gt("$alias.deletedAt", ":when")
        );
    }
} 